import { useState } from "react";
import StarRating from "./StarRating";
import { apiFetchJson, resolveApiErrorMessage } from "../config/api";

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

      const { response, data } = await apiFetchJson(`/products/${productId}/review`, {
        method: "POST",
        headers: {
          "x-user-email": email,
        },
        body: formData,
      });

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
      setError(resolveApiErrorMessage(submitError, "Failed to submit review"));
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
          className="btn-neon w-full py-3 text-sm"
        >
          ✍️ Write a Review
        </button>
      ) : (
        <div className="glass rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{ color: "#1a2f48" }}>Share Your Experience</h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xl text-[#6080a0] hover:text-[#1a2f48]"
            >
              ✕
            </button>
          </div>

          {error && <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
          {success && <p className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">{success}</p>}

          {/* Rating Selection */}
          <div className="mb-4">
            <label className="mb-3 block text-sm font-semibold text-[#1a2f48]">Rate this product</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-4xl transition ${
                    star <= rating ? "text-amber-400" : "text-slate-600 hover:text-amber-300"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold text-[#1a2f48]">Your review comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts about this product..."
              maxLength={500}
              className="input-dark min-h-20 w-full resize-none"
            />
            <p className="mt-1 text-xs" style={{ color: "#6080a0" }}>{comment.length}/500 characters</p>
          </div>

          {/* Image Upload */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold text-[#1a2f48]">Upload photos (optional)</label>
            <div className="rounded-lg border-2 border-dashed p-4" style={{ borderColor: "rgba(100,160,220,0.28)", background: "rgba(255,255,255,0.72)" }}>
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
                  <p className="text-sm font-medium text-sky-700">📷 Click to upload images</p>
                  <p className="mt-1 text-xs" style={{ color: "#6080a0" }}>Max 5 images, 5MB each</p>
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
              className="flex-1 rounded-lg btn-neon text-sm py-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : "✓ Submit Review"}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="btn-ghost rounded-lg px-4 py-2 text-sm"
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
