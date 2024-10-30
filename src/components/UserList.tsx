'use client';

import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

// Define the User type
type User = {
  id: string;
  name: string;
  email: string;
  username: string;
};

// Define the props type for UserListClient
interface UserListClientProps {
  initialUsers: User[];
}

const UserListClient: React.FC<UserListClientProps> = ({ initialUsers }) => {
  const [users, setUsers] = useState<User[]>(initialUsers);

  useEffect(() => {
    // You can add additional client-side effects here if needed
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>User List</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Username</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.username}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default UserListClient;
