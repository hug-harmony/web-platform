export type User = {
  id?: string;
  email: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  password?: string | null;
  phoneNumber?: string | null;
  googleId?: string | null;
  profileImage?: string | null;
  createdAt?: Date;
};
