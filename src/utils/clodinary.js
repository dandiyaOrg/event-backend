import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "anginat-event" }, // Specify the folder name here
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    stream.end(buffer);
  });
};
const uploadQRCodeToCloudinary = async (base64String) => {
  try {
    const base64Data = base64String.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const result = await uploadOnCloudinary(buffer);
    return { success: true, data: result.secure_url };
  } catch (error) {
    return { success: false, error: error };
  }
};
function getimagepublicid(url) {
  const parts = url.split("/");
  const public_id_segment = parts[parts.indexOf("upload") + 2]; // Get the segment after 'upload'

  // Further split the segment to extract the actual public ID
  const public_id_parts = public_id_segment.split(".");
  const public_id = public_id_parts[0];

  console.log(public_id); // Output: p5dbvx6rdx5sp7szocxj
  return public_id;
}
const deletefromCloudinary = async (clodinaryfilePaths, resource_type) => {
  try {
    let paths = [];
    for (let x of clodinaryfilePaths) {
      paths.push(getimagepublicid(x));
    }
    // const public_id = getimagepublicid(clodinaryfilePath);
    const result = await cloudinary.api.delete_resources(paths, {
      resource_type: resource_type || "image",
    });
    return result;
  } catch (error) {
    console.log("Error in deleting Cloudinary Image ", error);
    return null;
  }
};

export { uploadOnCloudinary, deletefromCloudinary, uploadQRCodeToCloudinary };
