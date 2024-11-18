import { UserList } from "@/components/users/user-list";

export default function UsersListPage() {
  // In a real app, you'd fetch users from an API here
  const initialUsers = [
    { id: 1, name: "John Doe", email: "john@example.com", username: "johndoe" },
    { id: 2, name: "Jane Smith", email: "jane@example.com", username: "janesmith" },
  ];

  return <UserList initialUsers={initialUsers} />;
}
