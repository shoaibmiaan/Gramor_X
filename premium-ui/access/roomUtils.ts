export interface RoomAccess {
  roomId: string;
  roomName: string;
  accessedAt: string;
  expiresAt?: string; // Optional expiration
}

export class PremiumRoomManager {
  private static readonly STORAGE_KEY = 'premiumRooms';

  static getAccessedRooms(): Record<string, RoomAccess> {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  static hasAccess(roomId: string): boolean {
    const rooms = this.getAccessedRooms();
    const access = rooms[roomId];
    
    if (!access) return false;
    
    // Check if access has expired
    if (access.expiresAt) {
      const expiresTime = new Date(access.expiresAt).getTime();
      const now = new Date().getTime();
      if (now > expiresTime) {
        this.revokeAccess(roomId);
        return false;
      }
    }
    
    return true;
  }

  static grantAccess(roomId: string, roomName: string, expiresInHours: number = 24): void {
    const rooms = this.getAccessedRooms();
    const accessedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();
    
    rooms[roomId] = {
      roomId,
      roomName,
      accessedAt,
      expiresAt
    };
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(rooms));
  }

  static revokeAccess(roomId: string): void {
    const rooms = this.getAccessedRooms();
    delete rooms[roomId];
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(rooms));
  }

  static clearAllAccess(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  static getAccessList(): RoomAccess[] {
    const rooms = this.getAccessedRooms();
    return Object.values(rooms).sort((a, b) => 
      new Date(b.accessedAt).getTime() - new Date(a.accessedAt).getTime()
    );
  }

  static getAccessTime(roomId: string): Date | null {
    const rooms = this.getAccessedRooms();
    const access = rooms[roomId];
    return access ? new Date(access.accessedAt) : null;
  }

  static getTimeUntilExpiry(roomId: string): number | null {
    const rooms = this.getAccessedRooms();
    const access = rooms[roomId];
    
    if (!access || !access.expiresAt) return null;
    
    const expiresTime = new Date(access.expiresAt).getTime();
    const now = new Date().getTime();
    return Math.max(0, expiresTime - now);
  }
}