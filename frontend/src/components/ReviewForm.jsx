import { useState } from "react";
import StarRating from "./StarRating";
import { apiFetchJson, resolveApiErrorMessage } from "../config/api";
import { Button } from "./ui/button";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

function ReviewForm({ productId, email, onReviewSubmitted }) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewImages, setReviewImages] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024);

    const newImages = [...reviewImages, ...validFiles].slice(0, 5);
    setReviewImages(newImages);

    const newPreviews = newImages.map((file) => URL.createObjectURL(file));
    setPreviewUrls(newPreviews);
  };

  const removeImage = (index) => {
    setReviewImages(reviewImages.filter((_, i) => i !== index));
    setPreviewUrls(previewUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (rating < 1) return setError("Please select a rating");
    if (!comment.trim()) return setError("Please share your thoughts");

    try {
      setIsSubmitting(true);
      setError("");

      const formData = new FormData();
      formData.append("rating", rating);
      formData.append("comment", comment.trim());
      reviewImages.forEach((image) => formData.append("reviewImages", image));

      const { response, data } = await apiFetchJson(`/products/${productId}/review`, {
        method: "POST",
        headers: { "x-user-email": email },
        body: formData,
      });

      if (!response.ok) throw new Error(data?.message || "Failed to submit review");

      setIsOpen(false);
      if (onReviewSubmitted) onReviewSubmitted(data);
    } catch (err) {
      setError(resolveApiErrorMessage(err, "Failed to submit review"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <PlusIcon className="w-4 h-4 mr-2" /> Share My Experience
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-neutral-dark/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="h-1.5 bg-primary w-full" />
        
        <div className="p-8 space-y-8">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h3 className="text-2xl font-heading font-bold">Write a Review</h3>
              <p className="text-xs text-neutral-dark/40 font-bold uppercase tracking-widest">Share your thoughts with the collection</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-neutral-dark/5 rounded-full transition-colors">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {error && <p className="p-4 bg-accent/5 text-accent text-xs font-bold rounded-sm border border-accent/10">{error}</p>}

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Select Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`text-3xl transition-all duration-300 ${
                      star <= rating ? "text-secondary scale-110" : "text-neutral-dark/10 hover:text-secondary/40"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Your Experience</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="How do you feel about this artisanal piece?"
                className="w-full border border-neutral-dark/10 p-4 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 rounded-sm min-h-[120px] transition-all resize-none"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Upload Photos (Max 5)</label>
              <div className="flex flex-wrap gap-4">
                <label className="w-20 h-20 border-2 border-dashed border-neutral-dark/10 rounded-sm flex items-center justify-center cursor-pointer hover:bg-neutral-dark/5 transition-colors">
                  <input type="file" multiple accept="image/*" onChange={handleImageSelect} className="hidden" />
                  <PlusIcon className="w-6 h-6 text-neutral-dark/20" />
                </label>
                {previewUrls.map((url, i) => (
                  <div key={i} className="relative w-20 h-20 group">
                    <img src={url} className="w-full h-full object-cover rounded-sm" />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute -top-2 -right-2 bg-accent text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="ghost" className="flex-1" onClick={() => setIsOpen(false)}>Discard</Button>
            <Button className="flex-2 h-14" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Publish Review"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReviewForm;
