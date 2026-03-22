import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Room, Client, Reservation, User, RoomStatus, ReservationStatus } from '../types';
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
  reservations: Reservation[];
  currentUser: User | null;
  isLoggedIn: boolean;
  loading: boolean;
  login: (pin: string) => boolean;
  logout: () => void;
  updateRoomStatus: (roomId: string, status: RoomStatus) => Promise<void>;
  addClient: (client: Omit<Client, 'id'>) => Promise<Client | null>;
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
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

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

  const updateRoomStatus = async (roomId: string, status: RoomStatus) => {
    const { error } = await supabase.from('rooms').update({ status }).eq('id', roomId);
    if (!error) setRooms(prev => prev.map(r => r.id === roomId ? { ...r, status } : r));
  };

  const addClient = async (client: Omit<Client, 'id'>) => {
    const { data, error } = await supabase.from('clients').insert([client]).select();
    if (!error && data) {
      setClients(prev => [...prev, data[0]]);
      return data[0];
    }
    return null;
  };

  const addReservation = async (reservation: Omit<Reservation, 'id'>) => {
    const { data, error } = await supabase.from('reservations').insert([reservation]).select();
    if (error) console.error("Error al insertar:", error);
    if (!error && data) setReservations(prev => [...prev, data[0]]);
  };

  const updateReservation = async (updatedRes: Reservation) => {
    const { error } = await supabase.from('reservations').update(updatedRes).eq('id', updatedRes.id);
    if (!error) setReservations(prev => prev.map(r => r.id === updatedRes.id ? updatedRes : r));
  };

  const deleteReservation = async (reservationId: string) => {
    const { error } = await supabase.from('reservations').delete().eq('id', reservationId);
    if (!error) setReservations(prev => prev.filter(r => r.id !== reservationId));
  };

  const updateReservationStatus = async (reservationId: string, status: ReservationStatus) => {
    const res = reservations.find(r => r.id === reservationId);
    if (!res) return;
    const { error } = await supabase.from('reservations').update({ status }).eq('id', reservationId);
    if (!error) {
      setReservations(prev => prev.map(r => r.id === reservationId ? { ...r, status } : r));
      if (status === ReservationStatus.CHECKED_IN) await updateRoomStatus(res.roomId, RoomStatus.OCCUPIED);
      else if (status === ReservationStatus.CHECKED_OUT) await updateRoomStatus(res.roomId, RoomStatus.CLEANING);
    }
  };

  const getRoomById = (id: string) => rooms.find(r => r.id === id);
  const getClientById = (id: string) => clients.find(c => c.id === id);

  return (
    <AppContext.Provider value={{
      rooms, clients, reservations, currentUser, isLoggedIn: !!currentUser,
      loading, login, logout, updateRoomStatus, addClient, addReservation,
      updateReservation, deleteReservation, updateReservationStatus, getRoomById, getClientById
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp must be used within an AppProvider');
  return context;
};