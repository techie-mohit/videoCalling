import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide a name"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Please provide an email"],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: 6,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    { _id: this._id},
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: "7d" }
  );
};

export default mongoose.model("User", userSchema);
