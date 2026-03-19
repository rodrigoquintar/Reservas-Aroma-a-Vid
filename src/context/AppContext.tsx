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
  addSale: (sale: Omit<Sale, 'id'>) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  updateProductStock: (productId: string, quantity: number) => Promise<void>;
  addMaintenanceItem: (item: Omit<MaintenanceItem, 'id'>) => Promise<void>;
  updateMaintenanceItem: (item: MaintenanceItem) => Promise<void>;
  deleteMaintenanceItem: (itemId: string) => Promise<void>;
  updateMaintenanceStock: (itemId: string, quantity: number) => Promise<void>;
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: roomsData },
        { data: clientsData },
        { data: productsData },
        { data: maintenanceData },
        { data: reservationsData },
        { data: salesData }
      ] = await Promise.all([
        supabase.from('rooms').select('*'),
        supabase.from('clients').select('*'),
        supabase.from('products').select('*'),
        supabase.from('maintenance_items').select('*'),
        supabase.from('reservations').select('*'),
        supabase.from('sales').select('*, items:sale_items(*)')
      ]);

      if (roomsData) setRooms(roomsData);
      if (clientsData) setClients(clientsData);
      if (productsData) setProducts(productsData);
      if (maintenanceData) setMaintenanceItems(maintenanceData);
      if (reservationsData) setReservations(reservationsData);
      if (salesData) setSales(salesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const addRoom = async (room: Omit<Room, 'id'>) => {
    const { data, error } = await supabase.from('rooms').insert([room]).select();
    if (!error && data) setRooms(prev => [...prev, data[0]]);
  };

  const updateRoom = async (updatedRoom: Room) => {
    const { error } = await supabase.from('rooms').update(updatedRoom).eq('id', updatedRoom.id);
    if (!error) setRooms(prev => prev.map(r => r.id === updatedRoom.id ? updatedRoom : r));
  };

  const deleteRoom = async (roomId: string) => {
    const { error } = await supabase.from('rooms').delete().eq('id', roomId);
    if (!error) setRooms(prev => prev.filter(r => r.id !== roomId));
  };

  const addClient = async (client: Omit<Client, 'id'>) => {
    const { data, error } = await supabase.from('clients').insert([client]).select();
    if (!error && data) {
      setClients(prev => [...prev, data[0]]);
      return data[0];
    }
    return null;
  };

  const deleteClient = async (clientId: string) => {
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (!error) setClients(prev => prev.filter(c => c.id !== clientId));
  };

  const addReservation = async (reservation: Omit<Reservation, 'id'>) => {
    const { data, error } = await supabase.from('reservations').insert([reservation]).select();
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

  const addSale = async (sale: Omit<Sale, 'id'>) => {
    const { data, error } = await supabase.from('sales').insert([{ date: sale.date, total: sale.total, reservationId: sale.reservationId }]).select();
    if (!error && data) {
      const saleId = data[0].id;
      const saleItems = sale.items.map(item => ({
        sale_id: saleId,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      }));
      await supabase.from('sale_items').insert(saleItems);
      
      // Update stock locally and on server
      for (const item of sale.items) {
        await updateProductStock(item.id, -item.quantity);
      }
      
      fetchData(); // Refresh to get full sale object with items
    }
  };

  const addProduct = async (product: Omit<Product, 'id'>) => {
    const { data, error } = await supabase.from('products').insert([product]).select();
    if (!error && data) setProducts(prev => [...prev, data[0]]);
  };

  const updateProduct = async (product: Product) => {
    const { error } = await supabase.from('products').update(product).eq('id', product.id);
    if (!error) setProducts(prev => prev.map(p => p.id === product.id ? product : p));
  };

  const deleteProduct = async (productId: string) => {
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (!error) setProducts(prev => prev.filter(p => p.id !== productId));
  };

  const updateProductStock = async (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const newStock = product.stock + quantity;
    const { error } = await supabase.from('products').update({ stock: newStock }).eq('id', productId);
    if (!error) setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: newStock } : p));
  };

  const addMaintenanceItem = async (item: Omit<MaintenanceItem, 'id'>) => {
    const { data, error } = await supabase.from('maintenance_items').insert([item]).select();
    if (!error && data) setMaintenanceItems(prev => [...prev, data[0]]);
  };

  const updateMaintenanceItem = async (item: MaintenanceItem) => {
    const { error } = await supabase.from('maintenance_items').update(item).eq('id', item.id);
    if (!error) setMaintenanceItems(prev => prev.map(i => i.id === item.id ? item : i));
  };

  const deleteMaintenanceItem = async (itemId: string) => {
    const { error } = await supabase.from('maintenance_items').delete().eq('id', itemId);
    if (!error) setMaintenanceItems(prev => prev.filter(i => i.id !== itemId));
  };

  const updateMaintenanceStock = async (itemId: string, quantity: number) => {
    const item = maintenanceItems.find(i => i.id === itemId);
    if (!item) return;
    const newStock = Math.max(0, item.stock + quantity);
    const { error } = await supabase.from('maintenance_items').update({ stock: newStock }).eq('id', itemId);
    if (!error) setMaintenanceItems(prev => prev.map(i => i.id === itemId ? { ...i, stock: newStock } : i));
  };

  const getRoomById = (id: string) => rooms.find(r => r.id === id);
  const getClientById = (id: string) => clients.find(c => c.id === id);

  return (
    <AppContext.Provider value={{
      rooms, clients, products, maintenanceItems, reservations, sales, currentUser, isLoggedIn: !!currentUser,
      loading, login, logout, updateRoomStatus, addRoom, updateRoom, deleteRoom, addClient, deleteClient, addReservation,
      updateReservation, deleteReservation, updateReservationStatus, addSale, addProduct, updateProduct,
      deleteProduct, updateProductStock, addMaintenanceItem, updateMaintenanceItem, deleteMaintenanceItem, 
      updateMaintenanceStock, getRoomById, getClientById
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
