// Mock user data
const mockUsers = [
    { role: 'doctor', email: 'doctor@example.com', password: 'doctor123' },
    { role: 'specialist', email: 'specialist@example.com', password: 'specialist123' },
];
  
// Mock authentication service
const authService = {
    isAuthenticated: false,
  
    login(email: string, password: string, role: string) {
      const user = mockUsers.find((u) => u.email === email && u.password === password && u.role === role);
      if (user) {
        this.isAuthenticated = true;
        localStorage.setItem('user', JSON.stringify(user));
        return { success: true, user };
      }
      return { success: false, message: 'Invalid email, password, or role' };
    },
  
    logout() {
      this.isAuthenticated = false;
      localStorage.removeItem('user');
    },
  
    getCurrentUser() {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    },
  
    isLoggedIn() {
      return !!this.getCurrentUser();
    },
};
  
export default authService;