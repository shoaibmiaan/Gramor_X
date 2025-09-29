export interface RoomAccess {
  roomId: string;
  roomName: string;
  accessedAt: string;
  userId?: string; // Link to authenticated user
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
    
    // Optional: Add access expiration (e.g., 24 hours)
    const accessedTime = new Date(access.accessedAt).getTime();
    const now = new Date().getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    if (now - accessedTime > twentyFourHours) {
      // Access expired, remove it
      this.revokeAccess(roomId);
      return false;
    }
    
    return true;
  }

  static grantAccess(roomId: string, roomName: string, userId?: string): void {
    const rooms = this.getAccessedRooms();
    rooms[roomId] = {
      roomId,
      roomName,
      accessedAt: new Date().toISOString(),
      userId
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

  // Get rooms accessible by current user
  static getUserRooms(userId?: string): RoomAccess[] {
    const allRooms = this.getAccessList();
    if (!userId) return allRooms;
    return allRooms.filter(room => !room.userId || room.userId === userId);
  }
}