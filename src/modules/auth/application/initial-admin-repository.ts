export type InitialAdminRecord = {
  name: string;
  email: string;
  passwordHash: string;
  role: "admin";
  sellerId: null;
  active: true;
};

export type CreatedInitialAdmin = {
  id: string;
  name: string;
  email: string;
};

export interface InitialAdminRepository {
  adminExists(): Promise<boolean>;
  userEmailExists(email: string): Promise<boolean>;
  createAdmin(admin: InitialAdminRecord): Promise<CreatedInitialAdmin>;
}
