import { create } from "zustand";

export const useIPSStore = create((set, get) => ({
  // =====================================================
  // ESTADO PRINCIPAL
  // =====================================================
  tableData: [],

  ipsObject: null,

  currentIPS: null,

  // =====================================================
  // ACCIONES
  // =====================================================

  setTableData: (data) => set({ tableData: data }),

  setIPSObject: (obj) => set({ ipsObject: obj }),

  setCurrentIPS: (ips) => set({ currentIPS: ips }),

  clearIPS: () =>
    set({
      ipsObject: null,
      currentIPS: null,
    }),

  clearAll: () =>
    set({
      tableData: [],
      ipsObject: null,
      currentIPS: null,
    }),
}));