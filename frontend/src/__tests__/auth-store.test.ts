import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "../store/auth-store";

describe("useAuthStore", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      isLoading: false,
      isInitialized: false,
      error: null,
    });
  });

  it("should initialize with default empty state", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it("should set user and token via setAuth", () => {
    const mockUser = {
      id: "123",
      email: "test@example.com",
      username: "testuser",
      role: "user",
      is_active: true,
      created_at: new Date().toISOString(),
    };

    useAuthStore.getState().setAuth(mockUser, "test-access-token");

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe("test-access-token");
    expect(state.error).toBeNull();
  });

  it("should clear state on logout", async () => {
    useAuthStore.setState({
      user: {
        id: "123",
        email: "test@example.com",
        username: "testuser",
        role: "user",
        is_active: true,
        created_at: "",
      },
      token: "valid-token",
    });

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });
});
