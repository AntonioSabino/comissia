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

export type InitialAdminCreationResult =
  | { status: "created"; admin: CreatedInitialAdmin }
  | { status: "admin-already-exists" }
  | { status: "email-in-use" };

export interface InitialAdminRepository {
  createInitialAdmin(
    admin: InitialAdminRecord,
  ): Promise<InitialAdminCreationResult>;
}
