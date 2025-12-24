/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { ProfilePictureUpload } from "./ProfilePictureUpload";
import { LocationAutocomplete } from "./LocationAutocomplete";
import { Profile } from "@/types/edit-profile";

interface Props {
  profile: Profile;
  setProfile: (p: Profile) => void;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  updating: boolean;
  selectedFile: File | null;
  setSelectedFile: (f: File | null) => void;
  formErrors: Record<string, string>;
  locationProps: any;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

export function PersonalInfoSection({
  profile,
  setProfile,
  isEditing,
  setIsEditing,
  updating,
  selectedFile,
  setSelectedFile,
  formErrors,
  locationProps,
  handleSubmit,
}: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl text-black dark:text-white">Personal Details</h2>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <ProfilePictureUpload
            profileImage={profile.profileImage}
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
            isEditing={isEditing}
            updating={updating}
            error={formErrors.profileImage}
          />

          {/* Name fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input
                name="firstName"
                value={profile.firstName || ""}
                onChange={(e) =>
                  setProfile({ ...profile, firstName: e.target.value })
                }
                required
                maxLength={50}
                disabled={updating}
                className="border-[#F3CFC6]"
              />
              {formErrors.firstName && (
                <p className="text-red-500 text-sm">{formErrors.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input
                name="lastName"
                value={profile.lastName || ""}
                onChange={(e) =>
                  setProfile({ ...profile, lastName: e.target.value })
                }
                required
                maxLength={50}
                disabled={updating}
                className="border-[#F3CFC6]"
              />
              {formErrors.lastName && (
                <p className="text-red-500 text-sm">{formErrors.lastName}</p>
              )}
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              name="phoneNumber"
              value={profile.phoneNumber || ""}
              onChange={(e) =>
                setProfile({ ...profile, phoneNumber: e.target.value })
              }
              disabled={updating}
              className="border-[#F3CFC6]"
            />
            {formErrors.phoneNumber && (
              <p className="text-red-500 text-sm">{formErrors.phoneNumber}</p>
            )}
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>Location</Label>
            <LocationAutocomplete
              value={profile.location || ""}
              onChange={(v) => setProfile({ ...profile, location: v })}
              disabled={updating}
              {...locationProps}
            />
          </div>

          {/* Biography */}
          <div className="space-y-2">
            <Label htmlFor="biography" className="text-black dark:text-white">
              Bio
            </Label>
            <Textarea
              id="biography"
              name="biography"
              value={profile.biography || ""}
              onChange={(e) =>
                setProfile({ ...profile, biography: e.target.value })
              }
              disabled={!isEditing || updating}
              className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
              maxLength={500}
            />
            {formErrors.biography && (
              <p className="text-red-500 text-sm">{formErrors.biography}</p>
            )}
          </div>

          {/* Relationship Status */}
          <div className="space-y-2">
            <Label
              htmlFor="relationshipStatus"
              className="text-black dark:text-white"
            >
              Relationship Status
            </Label>
            <Select
              name="relationshipStatus"
              value={profile.relationshipStatus || ""}
              onValueChange={(v) =>
                setProfile({ ...profile, relationshipStatus: v })
              }
              disabled={!isEditing || updating}
            >
              <SelectTrigger className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Single">Single</SelectItem>
                <SelectItem value="In a relationship">
                  In a relationship
                </SelectItem>
                <SelectItem value="Married">Married</SelectItem>
                <SelectItem value="Divorced">Divorced</SelectItem>
                <SelectItem value="Widowed">Widowed</SelectItem>
                <SelectItem value="Prefer not to say">
                  Prefer not to say
                </SelectItem>
              </SelectContent>
            </Select>
            {formErrors.relationshipStatus && (
              <p className="text-red-500 text-sm">
                {formErrors.relationshipStatus}
              </p>
            )}
          </div>

          {/* Orientation */}
          <div className="space-y-2">
            <Label htmlFor="orientation" className="text-black dark:text-white">
              Orientation
            </Label>
            <Select
              name="orientation"
              value={profile.orientation || ""}
              onValueChange={(v) => setProfile({ ...profile, orientation: v })}
              disabled={!isEditing || updating}
            >
              <SelectTrigger className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Heterosexual">Heterosexual</SelectItem>
                <SelectItem value="Homosexual">Homosexual</SelectItem>
                <SelectItem value="Bisexual">Bisexual</SelectItem>
                <SelectItem value="Asexual">Asexual</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
                <SelectItem value="Prefer not to say">
                  Prefer not to say
                </SelectItem>
              </SelectContent>
            </Select>
            {formErrors.orientation && (
              <p className="text-red-500 text-sm">{formErrors.orientation}</p>
            )}
          </div>

          {/* Height */}
          <div className="space-y-2">
            <Label htmlFor="height" className="text-black dark:text-white">
              Height
            </Label>
            <Input
              id="height"
              name="height"
              value={profile.height || ""}
              onChange={(e) =>
                setProfile({ ...profile, height: e.target.value })
              }
              disabled={!isEditing || updating}
              className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
              placeholder="e.g., 5'10 or 178 cm"
              maxLength={20}
            />
            {formErrors.height && (
              <p className="text-red-500 text-sm">{formErrors.height}</p>
            )}
          </div>

          {/* Ethnicity */}
          <div className="space-y-2">
            <Label htmlFor="ethnicity" className="text-black dark:text-white">
              Ethnicity
            </Label>
            <Input
              id="ethnicity"
              name="ethnicity"
              value={profile.ethnicity || ""}
              onChange={(e) =>
                setProfile({ ...profile, ethnicity: e.target.value })
              }
              disabled={!isEditing || updating}
              className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
              maxLength={50}
            />
            {formErrors.ethnicity && (
              <p className="text-red-500 text-sm">{formErrors.ethnicity}</p>
            )}
          </div>

          {/* Zodiac Sign */}
          <div className="space-y-2">
            <Label htmlFor="zodiacSign" className="text-black dark:text-white">
              Zodiac Sign
            </Label>
            <Select
              name="zodiacSign"
              value={profile.zodiacSign || ""}
              onValueChange={(v) => setProfile({ ...profile, zodiacSign: v })}
              disabled={!isEditing || updating}
            >
              <SelectTrigger className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Aries">Aries</SelectItem>
                <SelectItem value="Taurus">Taurus</SelectItem>
                <SelectItem value="Gemini">Gemini</SelectItem>
                <SelectItem value="Cancer">Cancer</SelectItem>
                <SelectItem value="Leo">Leo</SelectItem>
                <SelectItem value="Virgo">Virgo</SelectItem>
                <SelectItem value="Libra">Libra</SelectItem>
                <SelectItem value="Scorpio">Scorpio</SelectItem>
                <SelectItem value="Sagittarius">Sagittarius</SelectItem>
                <SelectItem value="Capricorn">Capricorn</SelectItem>
                <SelectItem value="Aquarius">Aquarius</SelectItem>
                <SelectItem value="Pisces">Pisces</SelectItem>
              </SelectContent>
            </Select>
            {formErrors.zodiacSign && (
              <p className="text-red-500 text-sm">{formErrors.zodiacSign}</p>
            )}
          </div>

          {/* Favorite Color */}
          <div className="space-y-2">
            <Label
              htmlFor="favoriteColor"
              className="text-black dark:text-white"
            >
              Favorite Color
            </Label>
            <Input
              id="favoriteColor"
              name="favoriteColor"
              value={profile.favoriteColor || ""}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  favoriteColor: e.target.value,
                })
              }
              disabled={!isEditing || updating}
              className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
              maxLength={30}
            />
            {formErrors.favoriteColor && (
              <p className="text-red-500 text-sm">{formErrors.favoriteColor}</p>
            )}
          </div>

          {/* Favorite Media */}
          <div className="space-y-2">
            <Label
              htmlFor="favoriteMedia"
              className="text-black dark:text-white"
            >
              Favorite Movie/TV Show
            </Label>
            <Input
              id="favoriteMedia"
              name="favoriteMedia"
              value={profile.favoriteMedia || ""}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  favoriteMedia: e.target.value,
                })
              }
              disabled={!isEditing || updating}
              className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white"
              maxLength={100}
            />
            {formErrors.favoriteMedia && (
              <p className="text-red-500 text-sm">{formErrors.favoriteMedia}</p>
            )}
          </div>

          {/* Pet Ownership */}
          <div className="space-y-2">
            <Label
              htmlFor="petOwnership"
              className="text-black dark:text-white"
            >
              Pet Ownership
            </Label>
            <Select
              name="petOwnership"
              value={profile.petOwnership || ""}
              onValueChange={(v) => setProfile({ ...profile, petOwnership: v })}
              disabled={!isEditing || updating}
            >
              <SelectTrigger className="border-[#F3CFC6] focus:ring-[#F3CFC6] text-black dark:text-white">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Dog">Dog</SelectItem>
                <SelectItem value="Cat">Cat</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
                <SelectItem value="None">None</SelectItem>
              </SelectContent>
            </Select>
            {formErrors.petOwnership && (
              <p className="text-red-500 text-sm">{formErrors.petOwnership}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(false)}
              disabled={updating}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updating}
              className="bg-[#F3CFC6] hover:bg-[#C4C4C4] rounded-full"
            >
              {updating ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-[#C4C4C4]">First Name</p>
            <p className="text-black dark:text-white break-words">
              {profile.firstName || "Not provided"}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#C4C4C4]">Last Name</p>
            <p className="text-black dark:text-white break-words">
              {profile.lastName || "Not provided"}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#C4C4C4]">Phone Number</p>
            <p className="text-black dark:text-white break-words">
              {profile.phoneNumber || "Not provided"}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#C4C4C4]">Location</p>
            <p className="text-black dark:text-white break-words">
              {profile.location || "Not provided"}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#C4C4C4]">Bio</p>
            <p className="text-black dark:text-white break-words">
              {profile.biography || "Not provided"}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#C4C4C4]">Relationship Status</p>
            <p className="text-black dark:text-white break-words">
              {profile.relationshipStatus || "Not provided"}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#C4C4C4]">Orientation</p>
            <p className="text-black dark:text-white break-words">
              {profile.orientation || "Not provided"}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#C4C4C4]">Height</p>
            <p className="text-black dark:text-white break-words">
              {profile.height || "Not provided"}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#C4C4C4]">Ethnicity</p>
            <p className="text-black dark:text-white break-words">
              {profile.ethnicity || "Not provided"}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#C4C4C4]">Zodiac Sign</p>
            <p className="text-black dark:text-white break-words">
              {profile.zodiacSign || "Not provided"}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#C4C4C4]">Favorite Color</p>
            <p className="text-black dark:text-white break-words">
              {profile.favoriteColor || "Not provided"}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#C4C4C4]">Favorite Movie/TV Show</p>
            <p className="text-black dark:text-white break-words">
              {profile.favoriteMedia || "Not provided"}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#C4C4C4]">Pet Ownership</p>
            <p className="text-black dark:text-white break-words">
              {profile.petOwnership || "Not provided"}
            </p>
          </div>

          {profile && (
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="text-[#F3CFC6] border-[#F3CFC6] hover:bg-[#fff]/80 dark:hover:bg-[#C4C4C4]/20 rounded-full"
            >
              Edit
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
