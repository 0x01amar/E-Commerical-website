const { GridFSBucket, ObjectId } = require("mongodb");

const GRIDFS_BUCKET_NAME = "productUploads";
let bucket = null;

const setGridFSBucket = (db) => {
  if (!db) {
    bucket = null;
    return null;
  }

  bucket = new GridFSBucket(db, { bucketName: GRIDFS_BUCKET_NAME });
  return bucket;
};

const getGridFSBucket = () => bucket;

const extractGridFSId = (value = "") => {
  const match = String(value || "").match(/\/uploads\/gridfs\/([a-f\d]{24})(?:\/|$)/i);
  return match?.[1] || "";
};

const uploadBufferToGridFS = ({ buffer, filename, contentType }) => {
  return new Promise((resolve, reject) => {
    if (!bucket) {
      reject(new Error("GridFS bucket is not ready"));
      return;
    }

    const safeFilename = String(filename || `upload-${Date.now()}`).trim() || `upload-${Date.now()}`;
    const uploadStream = bucket.openUploadStream(safeFilename, {
      contentType: contentType || "application/octet-stream",
      metadata: {
        uploadedAt: new Date(),
      },
    });

    uploadStream.on("error", reject);
    uploadStream.on("finish", () => {
      const fileId = uploadStream.id;

      if (!fileId) {
        reject(new Error("GridFS upload completed without file id"));
        return;
      }

      resolve(`/uploads/gridfs/${String(fileId)}/${encodeURIComponent(safeFilename)}`);
    });

    uploadStream.end(buffer);
  });
};

const deleteGridFSFileByPath = async (value = "") => {
  if (!bucket) {
    return false;
  }

  const id = extractGridFSId(value);

  if (!id) {
    return false;
  }

  try {
    await bucket.delete(new ObjectId(id));
    return true;
  } catch (error) {
    if (error?.code === 26 || error?.codeName === "NamespaceNotFound" || error?.message?.includes("FileNotFound")) {
      return false;
    }

    throw error;
  }
};

module.exports = {
  deleteGridFSFileByPath,
  extractGridFSId,
  getGridFSBucket,
  setGridFSBucket,
  uploadBufferToGridFS,
};
