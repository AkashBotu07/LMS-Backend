import Stripe from "stripe";
import { Course } from "../models/course.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { Lecture } from "../models/lecture.model.js";
import { User } from "../models/user.model.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async (req, res) => {
  try {
    const userId = req.id;
    const { courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found!" });

    // Create a new course purchase record
    const newPurchase = new CoursePurchase({
      courseId,
      userId,
      amount: course.coursePrice,
      status: "pending",
    });

    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: course.courseTitle,
              images: [course.courseThumbnail],
            },
            unit_amount: course.coursePrice * 100, // Amount in paise (lowest denomination)
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `http://localhost:5173/course-progress/${courseId}`, // Redirect after success
      cancel_url: `http://localhost:5173/course-detail/${courseId}`,
      metadata: {
        courseId: courseId,
        userId: userId,
      },
      shipping_address_collection: {
        allowed_countries: ["IN"], // Optionally restrict allowed countries
      },
    });

    if (!session.url) {
      return res.status(400).json({ success: false, message: "Error while creating session" });
    }

    // Save the purchase record
    newPurchase.paymentId = session.id;
    await newPurchase.save();

    return res.status(200).json({
      success: true,
      url: session.url, // Return the Stripe checkout URL
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Server error during checkout" });
  }
};

export const stripeWebhook = async (req, res) => {
  let event;

  try {
    const payloadString = JSON.stringify(req.body, null, 2);
    const secret = process.env.WEBHOOK_ENDPOINT_SECRET;

    const header = stripe.webhooks.generateTestHeaderString({
      payload: payloadString,
      secret,
    });

    event = stripe.webhooks.constructEvent(payloadString, header, secret);
    console.log("🟢 stripeWebhook Triggered! Event Type:", event?.type);

  } catch (error) {
    console.error("❌ Webhook error:", error.message);
    return res.status(400).send(`Webhook error: ${error.message}`);
  }

  // Handle the checkout session completed event
  if (event.type === "checkout.session.completed") {
    console.log("✅ Payment successful - Processing enrollment...");

    try {
      const session = event.data.object;

      const purchase = await CoursePurchase.findOne({
        paymentId: session.id,
      }).populate({ path: "courseId" });

      if (!purchase) {
        return res.status(404).json({ message: "Purchase not found" });
      }

      if (session.amount_total) {
        purchase.amount = session.amount_total / 100;
      }
      purchase.status = "completed";

      await purchase.save();

      // Debugging: Check if purchase contains user & course IDs
      console.log("🟡 User ID for Enrollment:", purchase.userId);
      console.log("🟡 Course ID for Enrollment:", purchase.courseId?._id);

      if (!purchase.userId || !purchase.courseId) {
        console.error("❌ Error: Missing userId or courseId in purchase.");
        return res.status(500).json({ message: "Invalid purchase data" });
      }

      // ✅ Automatically enroll the user in the course
      const updatedUser = await User.findByIdAndUpdate(
        purchase.userId,
        { $addToSet: { enrolledCourses: purchase.courseId._id } }, // Add course to enrolledCourses
        { new: true }
      ).populate("enrolledCourses");

      console.log("✅ Updated User After Purchase:", updatedUser);

      // ✅ Update course to add user ID to enrolledStudents
      await Course.findByIdAndUpdate(
        purchase.courseId._id,
        { $addToSet: { enrolledStudents: purchase.userId } },
        { new: true }
      );

      console.log("✅ Course updated with new student!");
    } catch (error) {
      console.error("❌ Error handling event:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
  res.status(200).send();
};

export const getCourseDetailWithPurchaseStatus = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.id;

    const course = await Course.findById(courseId)
      .populate({ path: "creator" })
      .populate({ path: "lectures" });

    const purchased = await CoursePurchase.findOne({ userId, courseId });

    if (!course) {
      return res.status(404).json({ message: "Course not found!" });
    }

    return res.status(200).json({
      course,
      purchased: !!purchased, // true if purchased, false otherwise
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error fetching course details" });
  }
};

export const getAllPurchasedCourse = async (req, res) => {
  try {
    const userId = req.id;
    
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const purchasedCourses = await CoursePurchase.find({ userId, status: "completed" })
      .populate("courseId");

    return res.status(200).json({
      purchasedCourses: purchasedCourses || [],
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Error retrieving purchased courses" });
  }
};
