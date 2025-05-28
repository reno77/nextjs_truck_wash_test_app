'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateUserForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      fullName: String(formData.get('fullName')),
      email: String(formData.get('email')),
      role: String(formData.get('role')),
      password: String(formData.get('password')),
    };

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error('A user with this email already exists');
        }
        throw new Error(responseData.error || 'Failed to create user');
      }

      if (responseData.user) {
        router.push('/manager/users');
        router.refresh();
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the user');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create User</h1>
      {error && (
        <div className="mb-4 p-4 text-red-700 bg-red-100 rounded-md border border-red-300">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow space-y-4">
        <div>
          <label className="block mb-1">Full Name</label>
          <input name="fullName" type="text" className="w-full border px-3 py-2 rounded" required />
        </div>
        <div>
          <label className="block mb-1">Email</label>
          <input name="email" type="email" className="w-full border px-3 py-2 rounded" required />
        </div>
        <div>
          <label className="block mb-1">Role</label>
          <select name="role" className="w-full border px-3 py-2 rounded" required>
            <option value="manager">Manager</option>
            <option value="washer">Washer</option>
            <option value="driver">Driver</option>
          </select>
        </div>
        <div>
          <label className="block mb-1">Password</label>
          <input name="password" type="password" className="w-full border px-3 py-2 rounded" required />
        </div>
        <button 
          type="submit" 
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:bg-blue-400"
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create User'}
        </button>
      </form>
    </div>
  );
}
