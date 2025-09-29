export interface RoomAccess {
  roomId: string;
  roomName: string;
  accessedAt: string;
}

export class PremiumRoomManager {
  static getAccessedRooms(): Record<string, RoomAccess> {
    if (typeof window === 'undefined') return {};
    return JSON.parse(localStorage.getItem('premiumRooms') || '{}');
  }

  static hasAccess(roomId: string): boolean {
    const rooms = this.getAccessedRooms();
    return !!rooms[roomId];
  }

  static getAccessTime(roomId: string): string | null {
    const rooms = this.getAccessedRooms();
    return rooms[roomId]?.accessedAt || null;
  }

  static revokeAccess(roomId: string): void {
    const rooms = this.getAccessedRooms();
    delete rooms[roomId];
    localStorage.setItem('premiumRooms', JSON.stringify(rooms));
  }

  static clearAllAccess(): void {
    localStorage.removeItem('premiumRooms');
  }

  static getAccessList(): RoomAccess[] {
    const rooms = this.getAccessedRooms();
    return Object.values(rooms).sort((a, b) => 
      new Date(b.accessedAt).getTime() - new Date(a.accessedAt).getTime()
    );
  }
}