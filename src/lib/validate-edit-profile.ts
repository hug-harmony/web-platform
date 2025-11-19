export async function validateUserProfileForm(
  form: FormData,
  selectedFile?: File | null
) {
  const errors: Record<string, string> = {};

  const firstName = form.get("firstName")?.toString().trim() ?? "";
  const lastName = form.get("lastName")?.toString().trim() ?? "";
  const phoneNumber = form.get("phoneNumber")?.toString().trim() ?? "";
  const location = form.get("location")?.toString().trim() ?? "";
  const biography = form.get("biography")?.toString() ?? "";
  const relationshipStatus = form.get("relationshipStatus")?.toString() ?? "";
  const orientation = form.get("orientation")?.toString() ?? "";
  const height = form.get("height")?.toString() ?? "";
  const ethnicity = form.get("ethnicity")?.toString() ?? "";
  const zodiacSign = form.get("zodiacSign")?.toString() ?? "";
  const favoriteColor = form.get("favoriteColor")?.toString() ?? "";
  const favoriteMedia = form.get("favoriteMedia")?.toString() ?? "";
  const petOwnership = form.get("petOwnership")?.toString() ?? "";

  if (!firstName) errors.firstName = "First name is required";
  else if (firstName.length > 50) errors.firstName = "Max 50 characters";

  if (!lastName) errors.lastName = "Last name is required";
  else if (lastName.length > 50) errors.lastName = "Max 50 characters";

  if (!phoneNumber) errors.phoneNumber = "Phone number is required";
  else if (!/^\+?[\d\s\-\(\)]{7,15}$/.test(phoneNumber))
    errors.phoneNumber = "Invalid phone format";

  if (location && location.length > 100) errors.location = "Max 100 characters";
  if (biography && biography.length > 500)
    errors.biography = "Max 500 characters";
  if (relationshipStatus && relationshipStatus.length > 50)
    errors.relationshipStatus = "Max 50 characters";
  if (orientation && orientation.length > 50)
    errors.orientation = "Max 50 characters";
  if (height && height.length > 20) errors.height = "Max 20 characters";
  if (ethnicity && ethnicity.length > 50)
    errors.ethnicity = "Max 50 characters";
  if (zodiacSign && zodiacSign.length > 20)
    errors.zodiacSign = "Max 20 characters";
  if (favoriteColor && favoriteColor.length > 30)
    errors.favoriteColor = "Max 30 characters";
  if (favoriteMedia && favoriteMedia.length > 100)
    errors.favoriteMedia = "Max 100 characters";
  if (petOwnership && petOwnership.length > 50)
    errors.petOwnership = "Max 50 characters";

  if (selectedFile) {
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(selectedFile.type))
      errors.profileImage = "Only JPEG, PNG, WebP allowed";
    else if (selectedFile.size > 5 * 1024 * 1024)
      errors.profileImage = "Max 5 MB";
  }

  return errors;
}

export function validateProfessionalProfileForm(form: FormData) {
  const errors: Record<string, string> = {};
  const biography = form.get("biography")?.toString().trim() ?? "";
  const rateStr = form.get("rate")?.toString() ?? "";
  const venue = form.get("venue")?.toString() ?? "";

  if (!biography) errors.biography = "Required";
  else if (biography.length > 500) errors.biography = "Max 500 characters";

  if (!rateStr) errors.rate = "Required";
  else {
    const rate = parseFloat(rateStr);
    if (isNaN(rate) || rate <= 0) errors.rate = "Must be positive";
    else if (rate > 10000) errors.rate = "Max 10,000";
  }

  if (!venue) errors.venue = "Required";
  else if (!["host", "visit", "both"].includes(venue))
    errors.venue = "Invalid selection";

  return errors;
}
