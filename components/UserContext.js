'use client';
import { createContext, useContext } from 'react';

const Ctx = createContext(null);
export const UserProvider = ({ user, children }) => <Ctx.Provider value={user}>{children}</Ctx.Provider>;
export const useUser = () => useContext(Ctx);
