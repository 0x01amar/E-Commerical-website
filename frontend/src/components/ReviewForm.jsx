import { useState } from "react";
import StarRating from "./StarRating";
import { apiUrl } from "../config/api";

function ReviewForm({ productId, email, onReviewSubmitted }) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewImages, setReviewImages] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        return false;
      }
      return true;
    });

    const newImages = [...reviewImages, ...validFiles].slice(0, 5);
    setReviewImages(newImages);

    const newPreviews = newImages.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(newPreviews).then((urls) => setPreviewUrls(urls));
  };

  const removeImage = (index) => {
    const updated = reviewImages.filter((_, i) => i !== index);
    setReviewImages(updated);
    setPreviewUrls(previewUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (rating < 1) {
      setError("Please select a rating");
      return;
    }

    if (!comment.trim()) {
      setError("Please write a review comment");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      setSuccess("");

      const formData = new FormData();
      formData.append("rating", rating);
      formData.append("comment", comment.trim());
      reviewImages.forEach((image) => {
        formData.append("reviewImages", image);
      });

      const response = await fetch(apiUrl(`/products/${productId}/review`), {
        method: "POST",
        headers: {
          "x-user-email": email,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Failed to submit review");
      }

      setSuccess("Review submitted successfully!");
      setRating(0);
      setComment("");
      setReviewImages([]);
      setPreviewUrls([]);
      setIsOpen(false);

      if (onReviewSubmitted) {
        onReviewSubmitted(data);
      }
    } catch (submitError) {
      setError(submitError.message || "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-3 text-sm font-semibold text-white transition hover:from-indigo-700 hover:to-indigo-800 shadow-md"
        >
          ✍️ Write a Review
        </button>
      ) : (
        <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Share Your Experience</h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xl text-slate-500 hover:text-slate-700"
            >
              ✕
            </button>
          </div>

          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 mb-4">{error}</p>}
          {success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-600 mb-4">{success}</p>}

          {/* Rating Selection */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-900 mb-3">Rate this product</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-4xl transition ${
                    star <= rating ? "text-amber-400" : "text-slate-300 hover:text-amber-200"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-900 mb-2">Your review comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts about this product..."
              maxLength={500}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 resize-none h-24"
            />
            <p className="mt-1 text-xs text-slate-500">{comment.length}/500 characters</p>
          </div>

          {/* Image Upload */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-900 mb-2">Upload photos (optional)</label>
            <div className="rounded-lg border-2 border-dashed border-indigo-300 bg-white p-4">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageSelect}
                disabled={reviewImages.length >= 5}
                className="hidden"
                id="review-image-input"
              />
              <label htmlFor="review-image-input" className="block">
                <div className="cursor-pointer text-center">
                  <p className="text-sm font-medium text-indigo-600">📷 Click to upload images</p>
                  <p className="mt-1 text-xs text-slate-500">Max 5 images, 5MB each</p>
                </div>
              </label>
            </div>

            {/* Image Previews */}
            {previewUrls.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative rounded-lg overflow-hidden">
                    <img src={url} alt={`Preview ${index + 1}`} className="h-24 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 rounded-full bg-rose-500 text-white w-6 h-6 flex items-center justify-center hover:bg-rose-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : "✓ Submit Review"}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReviewForm;
