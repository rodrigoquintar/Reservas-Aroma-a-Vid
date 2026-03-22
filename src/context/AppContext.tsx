import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Room, Client, Product, Reservation, Sale, RoomStatus, ReservationStatus, MaintenanceItem, User } from '../types';
import { supabase } from '../supabase';

const PIN_ADMIN = "0209";
const PIN_REC = "1011";

const USERS: Record<string, User> = {
  [PIN_ADMIN]: { id: 'u1', name: 'Admin General', role: 'admin' },
  [PIN_REC]: { id: 'u2', name: 'Recepcionista', role: 'receptionist' },
};

interface AppContextType {
  rooms: Room[];
  clients: Client[];
  products: Product[];
  maintenanceItems: MaintenanceItem[];
  reservations: Reservation[];
  sales: Sale[];
  currentUser: User | null;
  isLoggedIn: boolean;
  loading: boolean;
  login: (pin: string) => boolean;
  logout: () => void;
  updateRoomStatus: (roomId: string, status: RoomStatus) => Promise<void>;
  addRoom: (room: Omit<Room, 'id'>) => Promise<void>;
  updateRoom: (room: Room) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<void>;
  addClient: (client: Omit<Client, 'id'>) => Promise<Client | null>;
  deleteClient: (clientId: string) => Promise<void>;
  addReservation: (reservation: Omit<Reservation, 'id'>) => Promise<void>;
  updateReservation: (reservation: Reservation) => Promise<void>;
  deleteReservation: (reservationId: string) => Promise<void>;
  updateReservationStatus: (reservationId: string, status: ReservationStatus) => Promise<void>;
  getRoomById: (id: string) => Room | undefined;
  getClientById: (id: string) => Client | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('AROMA_SESSION');
    return saved ? JSON.parse(saved) : null;
  });

  const [rooms, setRooms] = useState<Room[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [maintenanceItems, setMaintenanceItems] = useState<MaintenanceItem[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  /* ===============================
     FETCH INICIAL
     =============================== */
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: roomsData } = await supabase.from('rooms').select('*');
      const { data: clientsData } = await supabase.from('clients').select('*');
      const { data: resData } = await supabase.from('reservations').select('*');

      if (roomsData) setRooms(roomsData);
      if (clientsData) setClients(clientsData);
      if (resData) setReservations(resData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  /* ===============================
     AUTH
     =============================== */
  const login = (pin: string) => {
    if (USERS[pin]) {
      setCurrentUser(USERS[pin]);
      localStorage.setItem('AROMA_SESSION', JSON.stringify(USERS[pin]));
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('AROMA_SESSION');
  };

  /* ===============================
     ROOMS
     =============================== */
  const updateRoomStatus = async (roomId: string, status: RoomStatus) => {
    const { error } = await supabase.from('rooms').update({ status }).eq('id', roomId);
    if (!error) {
      setRooms(prev => prev.map(r => r.id === roomId ? { ...r, status } : r));
    }
  };

  const addRoom = async (room: Omit<Room, 'id'>) => {
    const { data, error } = await supabase.from('rooms').insert([room]).select();
    if (!error && data) setRooms(prev => [...prev, data[0]]);
  };

  const updateRoom = async (room: Room) => {
    const { error } = await supabase.from('rooms').update(room).eq('id', room.id);
    if (!error) setRooms(prev => prev.map(r => r.id === room.id ? room : r));
  };

  const deleteRoom = async (roomId: string) => {
    const { error } = await supabase.from('rooms').delete().eq('id', roomId);
    if (!error) setRooms(prev => prev.filter(r => r.id !== roomId));
  };

  /* ===============================
     CLIENTES
     =============================== */
  const addClient = async (client: Omit<Client, 'id'>) => {
    const tempId = `c-${Date.now()}`;
    const { data, error } = await supabase.from('clients').insert([{ ...client, id: tempId }]).select();

    if (error) return null;

    if (data && data[0]) {
      setClients(prev => [...prev, data[0]]);
      return data[0];
    }
    return null;
  };

  const deleteClient = async (clientId: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (!error) setClients(prev => prev.filter(c => c.id !== clientId));
  };

  /* ===============================
     RESERVAS (CORREGIDO 🔥)
     =============================== */
  const addReservation = async (reservation: Omit<Reservation, 'id'>) => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const customId = `${month}-${randomNum}`;

    const payload = {
      id: customId,
      clientId: reservation.clientId,
      roomId: reservation.roomId,

      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut,

      checkInTime: reservation.checkInTime || "14:00",
      checkOutTime: reservation.checkOutTime || "10:00",

      status: reservation.status || 'Confirmada',

      totalAmount: Number(reservation.totalAmount) || 0,
      paidAmount: Number(reservation.paidAmount) || 0,
      deposit: Number(reservation.deposit) || 0,
      guests: Number(reservation.guests) || 1,
      storeCharges: Number(reservation.storeCharges) || 0,

      notes: reservation.notes || ""
    };

    const { data, error } = await supabase.from('reservations').insert([payload]).select();

    if (error) {
      console.error("Error reserva:", error);
      alert("Error de Supabase: " + error.message);
      return;
    }

    if (data) {
      setReservations(prev => [...prev, data[0]]);
    }
  };

  const updateReservation = async (res: Reservation) => {
    const { error } = await supabase
      .from('reservations')
      .update({
        ...res,
        totalAmount: Number(res.totalAmount),
        deposit: Number(res.deposit),
        paidAmount: Number(res.paidAmount),
        guests: Number(res.guests),
        storeCharges: Number(res.storeCharges)
      })
      .eq('id', res.id);

    if (!error) {
      setReservations(prev => prev.map(r => r.id === res.id ? res : r));
    }
  };

  const deleteReservation = async (id: string) => {
    const { error } = await supabase.from('reservations').delete().eq('id', id);
    if (!error) setReservations(prev => prev.filter(r => r.id !== id));
  };

  const updateReservationStatus = async (id: string, status: ReservationStatus) => {
    const { error } = await supabase.from('reservations').update({ status }).eq('id', id);

    if (!error) {
      setReservations(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    }
  };

  /* ===============================
     HELPERS
     =============================== */
  const getRoomById = (id: string) => rooms.find(r => r.id === id);
  const getClientById = (id: string) => clients.find(c => c.id === id);

  return (
    <AppContext.Provider value={{
      rooms,
      clients,
      products,
      maintenanceItems,
      reservations,
      sales,
      currentUser,
      isLoggedIn: !!currentUser,
      loading,
      login,
      logout,
      updateRoomStatus,
      addRoom,
      updateRoom,
      deleteRoom,
      addClient,
      deleteClient,
      addReservation,
      updateReservation,
      deleteReservation,
      updateReservationStatus,
      getRoomById,
      getClientById
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp debe usarse dentro de AppProvider');
  return context;
};