export type UserRole = 'customer' | 'owner' | 'staff' | 'admin';

export type AuthUser = {
  id: string;
  role: UserRole;
};
