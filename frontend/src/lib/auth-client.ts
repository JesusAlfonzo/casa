import { api, tokenStorage } from "./api-client";

export interface User {
  id: string;
  name: string;
  lastName?: string | null;
  email: string;
  username?: string | null;
  phone?: string | null;
  image?: string | null;
  isActive: boolean;
  roles?: Array<{
    role: {
      id: string;
      name: string;
      description?: string | null;
    };
  }>;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
}

export interface AuthResponse {
  user: User;
  session?: Session;
  token?: string;
  message?: string;
}

export interface SignInCredentials {
  email?: string;
  username?: string;
  password: string;
}

export interface SignUpData {
  name: string;
  lastName?: string;
  email: string;
  username?: string;
  password: string;
  phone?: string;
}

export const authClient = {
  async signIn(credentials: SignInCredentials): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>("/auth/signin", credentials);
    const token = res.token || res.session?.token;
    if (token) {
      tokenStorage.set(token);
    }
    return res;
  },

  async signUp(data: SignUpData): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>("/auth/signup", data);
    const token = res.token || res.session?.token;
    if (token) {
      tokenStorage.set(token);
    }
    return res;
  },

  async signOut(): Promise<void> {
    try {
      await api.post("/auth/signout");
    } catch {
      // Ignoramos si la sesión ya expiró
    } finally {
      tokenStorage.remove();
    }
  },

  async getSession(): Promise<{ user: User | null; session: Session | null }> {
    const token = tokenStorage.get();
    if (!token) {
      return { user: null, session: null };
    }

    try {
      const res = await api.get<{ user: User; session: Session }>("/auth/session");
      return res;
    } catch {
      tokenStorage.remove();
      return { user: null, session: null };
    }
  },

  async getMe(): Promise<User | null> {
    const token = tokenStorage.get();
    if (!token) return null;

    try {
      const res = await api.get<{ user: User }>("/auth/me");
      return res.user;
    } catch {
      return null;
    }
  },
};
