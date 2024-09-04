import React from 'react';
import UserList from '../../components/UserList';

async function getUsers() {
  const res = await fetch('https://jsonplaceholder.typicode.com/users', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to fetch users');
  }
  return res.json();
}

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-5">Users</h1>
      <UserList initialUsers={users} />
    </div>
  );
}