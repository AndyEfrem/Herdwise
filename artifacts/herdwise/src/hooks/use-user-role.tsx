import { createContext, useContext, type ReactNode } from "react";
import { useGetMe } from "@workspace/api-client-react";

type UserRole = "admin" | "investor" | "pending";

interface UserRoleContext {
  role: UserRole;
  investorId: number | null;
  investorName: string | null;
  isAdmin: boolean;
  isInvestor: boolean;
  isPending: boolean;
  isLoading: boolean;
}

const RoleContext = createContext<UserRoleContext>({
  role: "pending",
  investorId: null,
  investorName: null,
  isAdmin: false,
  isInvestor: false,
  isPending: true,
  isLoading: true,
});

export function UserRoleProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useGetMe();

  const role = (data?.role as UserRole) ?? "pending";
  const investorId = data?.investorId ?? null;
  const investorName = data?.investorName ?? null;

  return (
    <RoleContext.Provider value={{
      role,
      investorId,
      investorName,
      isAdmin: role === "admin",
      isInvestor: role === "investor",
      isPending: role === "pending",
      isLoading,
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useUserRole() {
  return useContext(RoleContext);
}
