export enum UserRole {
  manager = 'MANAGER',
  washer = 'WASHER',
  driver = 'DRIVER'
}

export type User = {
  id: number;
  email: string;
  passwordHash?: string;
  fullName: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateUserInput = Omit<User, 'id' | 'passwordHash' | 'createdAt' | 'updatedAt'> & {
  password: string;
};

export type UpdateUserInput = Partial<Omit<User, 'passwordHash' | 'createdAt' | 'updatedAt'>>;
