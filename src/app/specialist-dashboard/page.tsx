import React from 'react';

const dashboard = () => {
  // Fetch or pass in data to display scheduled calls
  const calls = [
    { id: 1, patient: 'John Doe', time: '10:00 AM', status: 'Scheduled' },
    { id: 2, patient: 'Jane Smith', time: '11:00 AM', status: 'Scheduled' },
  ];

  const startCall = (id: number) => {
    console.log('Starting call with ID:', id);
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-5">Doctor Dashboard</h1>
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th>Patient</th>
            <th>Time</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call) => (
            <tr key={call.id}>
              <td>{call.patient}</td>
              <td>{call.time}</td>
              <td>{call.status}</td>
              <td>
                <button onClick={() => startCall(call.id)}>Start Call</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default dashboard;
