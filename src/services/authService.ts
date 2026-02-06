/**
 * Authentication Service - Mobile Number Based Access Control
 * Manages user authentication and authorization
 */

export interface User {
  id: string;
  phoneNumber: string;
  name: string;
  role: 'admin' | 'user' | 'readonly';
  permissions: {
    viewDashboard: boolean;
    viewSettings: boolean;
    editCompanies: boolean;
    editIntegrations: boolean;
    editAlerts: boolean;
    editLLMSettings: boolean;
    addUsers: boolean;
    removeUsers: boolean;
  };
  createdAt: Date;
  lastLogin?: Date;
  active: boolean;
}

export interface AuthConfig {
  requireAuth: boolean;
  allowedNumbers: string[];
  sessionTimeout: number; // minutes
}

class AuthService {
  private currentUser: User | null = null;
  private config: AuthConfig = {
    requireAuth: true,
    allowedNumbers: [],
    sessionTimeout: 60, // 1 hour
  };

  constructor() {
    this.loadConfig();
    this.loadCurrentUser();
    this.setupSessionMonitoring();
  }

  /**
   * Load auth configuration
   */
  private loadConfig() {
    const stored = localStorage.getItem('auth_config');
    if (stored) {
      try {
        this.config = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to load auth config:', e);
      }
    }
  }

  /**
   * Save auth configuration
   */
  saveConfig(config: AuthConfig) {
    this.config = config;
    localStorage.setItem('auth_config', JSON.stringify(config));
  }

  /**
   * Get current configuration
   */
  getConfig(): AuthConfig {
    return this.config;
  }

  /**
   * Load current user from session
   */
  private loadCurrentUser() {
    const stored = localStorage.getItem('current_user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        // Check session timeout
        if (user.lastLogin) {
          const lastLogin = new Date(user.lastLogin);
          const now = new Date();
          const minutesSinceLogin = (now.getTime() - lastLogin.getTime()) / 60000;
          
          if (minutesSinceLogin > this.config.sessionTimeout) {
            // Session expired
            this.logout();
            return;
          }
        }
        this.currentUser = {
          ...user,
          createdAt: new Date(user.createdAt),
          lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined,
        };
      } catch (e) {
        console.error('Failed to load current user:', e);
      }
    }
  }

  /**
   * Setup session monitoring
   */
  private setupSessionMonitoring() {
    // Import device service to check if mobile
    import('./deviceService').then(({ deviceService }) => {
      // Check session every minute
      setInterval(() => {
        // Mobile devices never timeout (for receiving alerts)
        if (deviceService.isMobile()) {
          return; // Skip timeout check on mobile
        }

        if (this.currentUser && this.currentUser.lastLogin) {
          const now = new Date();
          const minutesSinceLogin = (now.getTime() - this.currentUser.lastLogin.getTime()) / 60000;
          
          if (minutesSinceLogin > this.config.sessionTimeout) {
            console.log('Session expired, logging out...');
            this.logout();
            window.location.reload();
          }
        }
      }, 60000); // Check every minute
    });
  }

  /**
   * Authenticate user with phone number
   */
  async login(phoneNumber: string, verificationCode?: string): Promise<{ success: boolean; message?: string; user?: User }> {
    // Normalize phone number
    const normalizedNumber = this.normalizePhoneNumber(phoneNumber);

    // Check if authentication is required
    if (!this.config.requireAuth) {
      // Auto-login as admin if auth disabled
      const user = this.createDefaultUser(normalizedNumber, 'admin');
      this.setCurrentUser(user);
      return { success: true, user };
    }

    // Check if number is in allowed list
    const users = this.getAllUsers();
    const user = users.find(u => u.phoneNumber === normalizedNumber && u.active);

    if (!user) {
      return { 
        success: false, 
        message: 'Phone number not authorized. Contact administrator.' 
      };
    }

    // In production, verify code with backend
    // For now, accept any 6-digit code or skip if not provided
    if (verificationCode && verificationCode.length !== 6) {
      return {
        success: false,
        message: 'Invalid verification code. Must be 6 digits.'
      };
    }

    // Set as current user
    this.setCurrentUser(user);

    return { success: true, user };
  }

  /**
   * Logout current user
   */
  logout() {
    this.currentUser = null;
    localStorage.removeItem('current_user');
    localStorage.removeItem('session_token');
  }

  /**
   * Get current logged-in user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    if (!this.config.requireAuth) return true;
    return this.currentUser !== null;
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: keyof User['permissions']): boolean {
    if (!this.config.requireAuth) return true;
    if (!this.currentUser) return false;
    return this.currentUser.permissions[permission];
  }

  /**
   * Get all users
   */
  getAllUsers(): User[] {
    const stored = localStorage.getItem('users');
    if (!stored) return [];
    
    try {
      const users = JSON.parse(stored);
      return users.map((u: any) => ({
        ...u,
        createdAt: new Date(u.createdAt),
        lastLogin: u.lastLogin ? new Date(u.lastLogin) : undefined,
      }));
    } catch (e) {
      console.error('Failed to load users:', e);
      return [];
    }
  }

  /**
   * Add new user
   */
  addUser(phoneNumber: string, name: string, role: User['role']): User {
    const normalizedNumber = this.normalizePhoneNumber(phoneNumber);
    
    // Check if user already exists
    const users = this.getAllUsers();
    if (users.find(u => u.phoneNumber === normalizedNumber)) {
      throw new Error('User with this phone number already exists');
    }

    const user = this.createDefaultUser(normalizedNumber, role);
    user.name = name;

    users.push(user);
    this.saveUsers(users);

    return user;
  }

  /**
   * Update user
   */
  updateUser(userId: string, updates: Partial<User>): User {
    const users = this.getAllUsers();
    const index = users.findIndex(u => u.id === userId);
    
    if (index === -1) {
      throw new Error('User not found');
    }

    users[index] = {
      ...users[index],
      ...updates,
      id: userId, // Don't allow ID change
      createdAt: users[index].createdAt, // Don't allow created date change
    };

    this.saveUsers(users);

    // If updating current user, refresh
    if (this.currentUser?.id === userId) {
      this.currentUser = users[index];
      localStorage.setItem('current_user', JSON.stringify(this.currentUser));
    }

    return users[index];
  }

  /**
   * Remove user
   */
  removeUser(userId: string) {
    const users = this.getAllUsers();
    const filtered = users.filter(u => u.id !== userId);
    
    if (filtered.length === users.length) {
      throw new Error('User not found');
    }

    // Don't allow removing self
    if (this.currentUser?.id === userId) {
      throw new Error('Cannot remove yourself');
    }

    this.saveUsers(filtered);
  }

  /**
   * Deactivate user (soft delete)
   */
  deactivateUser(userId: string) {
    this.updateUser(userId, { active: false });
  }

  /**
   * Reactivate user
   */
  reactivateUser(userId: string) {
    this.updateUser(userId, { active: true });
  }

  /**
   * Set current user
   */
  private setCurrentUser(user: User) {
    user.lastLogin = new Date();
    this.currentUser = user;
    localStorage.setItem('current_user', JSON.stringify(user));
    
    // Update user in users list
    const users = this.getAllUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      users[index] = user;
      this.saveUsers(users);
    }
  }

  /**
   * Save users to storage
   */
  private saveUsers(users: User[]) {
    localStorage.setItem('users', JSON.stringify(users));
  }

  /**
   * Normalize phone number
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let normalized = phoneNumber.replace(/\D/g, '');
    
    // Add country code if missing (assume US +1)
    if (normalized.length === 10) {
      normalized = '1' + normalized;
    }
    
    return normalized;
  }

  /**
   * Format phone number for display
   */
  formatPhoneNumber(phoneNumber: string): string {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    
    if (normalized.length === 11 && normalized.startsWith('1')) {
      // US number: +1 (234) 567-8900
      return `+1 (${normalized.slice(1, 4)}) ${normalized.slice(4, 7)}-${normalized.slice(7)}`;
    }
    
    // International: +XX XXXXXXXXXX
    return `+${normalized}`;
  }

  /**
   * Create default user with role-based permissions
   */
  private createDefaultUser(phoneNumber: string, role: User['role']): User {
    const permissions = this.getDefaultPermissions(role);
    
    return {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      phoneNumber,
      name: this.formatPhoneNumber(phoneNumber),
      role,
      permissions,
      createdAt: new Date(),
      active: true,
    };
  }

  /**
   * Get default permissions for role
   */
  private getDefaultPermissions(role: User['role']): User['permissions'] {
    switch (role) {
      case 'admin':
        return {
          viewDashboard: true,
          viewSettings: true,
          editCompanies: true,
          editIntegrations: true,
          editAlerts: true,
          editLLMSettings: true,
          addUsers: true,
          removeUsers: true,
        };
      case 'user':
        return {
          viewDashboard: true,
          viewSettings: true,
          editCompanies: false,
          editIntegrations: false,
          editAlerts: true,
          editLLMSettings: false,
          addUsers: false,
          removeUsers: false,
        };
      case 'readonly':
        return {
          viewDashboard: true,
          viewSettings: true,
          editCompanies: false,
          editIntegrations: false,
          editAlerts: false,
          editLLMSettings: false,
          addUsers: false,
          removeUsers: false,
        };
      default:
        return {
          viewDashboard: false,
          viewSettings: false,
          editCompanies: false,
          editIntegrations: false,
          editAlerts: false,
          editLLMSettings: false,
          addUsers: false,
          removeUsers: false,
        };
    }
  }

  /**
   * Initialize with admin user
   */
  initializeWithAdmin(adminPhone: string, name: string) {
    const users = this.getAllUsers();
    if (users.length === 0) {
      const admin = this.addUser(adminPhone, name, 'admin');
      console.log('✅ Admin user created:', this.formatPhoneNumber(admin.phoneNumber));
      return admin;
    }
    return null;
  }

  /**
   * Send verification code (requires backend)
   */
  async sendVerificationCode(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    const normalizedNumber = this.normalizePhoneNumber(phoneNumber);
    
    // TODO: Implement backend API call to send SMS
    console.log(`📱 Would send verification code to ${this.formatPhoneNumber(normalizedNumber)}`);
    
    // Placeholder for backend API:
    // await fetch('/api/auth/send-code', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ phoneNumber: normalizedNumber }),
    // });
    
    return {
      success: true,
      message: 'Verification code sent! (In production, check your phone)',
    };
  }

  /**
   * Check if setup is needed (no users exist)
   */
  needsSetup(): boolean {
    return this.getAllUsers().length === 0;
  }
}

export const authService = new AuthService();
