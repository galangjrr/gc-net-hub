"use client";

import { useState, useEffect, useRef } from "react";
import { Database, CheckCircle, Clock, XCircle, FileImage, Plus, MagnifyingGlass, Desktop } from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { DatabaseSchema, Booking, PC, Paket } from "@/lib/db";

export default function DataBookingPage() {
  const [db, setDb] = useState<DatabaseSchema | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [editBookingId, setEditBookingId] = useState<string | null>(null);
  const prevPendingCount = useRef<number>(0);

  const [showManual, setShowManual] = useState(false);
  const [manualData, setManualData] = useState({ playerName: "", pcId: "", searchPc: "" });
  const [showPcList, setShowPcList] = useState(false);
  const [buktiImage, setBuktiImage] = useState<string | null>(null);
  const [searchPaket, setSearchPaket] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPaket, setSelectedPaket] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchPaket);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchPaket]);

  const handleManualSubmit = async () => {
    let finalPcId = manualData.pcId;
    if (!finalPcId && manualData.searchPc) {
      const matched = db?.pcs?.find(p => p.name.toLowerCase() === manualData.searchPc.toLowerCase());
      if (matched) finalPcId = matched.id;
    }

    if (!finalPcId || !selectedPaket) return alert("Lengkapi data PC dan Paket!");
    
    let finalPaketId = selectedPaket;
    
    if (selectedPaket.startsWith("custom-")) {
      const priceNum = parseInt(selectedPaket.replace("custom-", ""));
      const mins = (priceNum / 1000) * 15;
      const hours = Math.floor(mins / 60);
      const remMins = mins % 60;
      let timeStr = "";
      if (hours > 0) timeStr += `${hours} Jam `;
      if (remMins > 0) timeStr += `${remMins} Menit`;

      const newPaketRes = await fetch("/api/pakets", {
        method: "POST",
        body: JSON.stringify({ name: `Personal ${timeStr.trim()}`, price: priceNum, is_custom: true })
      });
      const createdPaket = await newPaketRes.json();
      finalPaketId = createdPaket.id;
    }

    setLoadingId("manual-loading");
    if (editBookingId) {
      await fetch(`/api/bookings/${editBookingId}`, {
        method: "PUT",
        body: JSON.stringify({
          action: "edit_booking",
          pc_id: finalPcId,
          paket_id: finalPaketId,
          player_name: manualData.playerName
        })
      });
    } else {
      await fetch("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          pc_id: finalPcId,
          paket_id: finalPaketId,
          player_name: manualData.playerName,
          is_admin_manual: true
        })
      });
    }
    
    setShowManual(false);
    setEditBookingId(null);
    setManualData({ playerName: "", pcId: "", searchPc: "" });
    setSearchPaket("");
    setSelectedPaket(null);
    setShowPcList(false);
    await loadData();
    setLoadingId(null);
  };

  const loadData = async () => {
    const res = await fetch("/api/data");
    const data = await res.json();
    setDb(data);

    // Notification Logic
    if (data.bookings) {
      const currentPending = data.bookings.filter((b: Booking) => b.status === "pending");
      const currentPendingCount = currentPending.length;
      
      if (currentPendingCount > prevPendingCount.current) {
        // Trigger Audio (using a simple beep data URI to avoid needing an external file)
        const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"); // Short beep placeholder, will use a standard beep
        audio.play().catch(e => console.log("Audio play blocked by browser", e));
        
        // Trigger Desktop Notification
        if (Notification.permission === "granted") {
          new Notification("Booking Baru!", {
            body: `Ada ${currentPendingCount - prevPendingCount.current} booking baru masuk ke antrean. Segera verifikasi!`,
            icon: "/favicon.ico"
          });
        }
      }
      prevPendingCount.current = currentPendingCount;
    }
  };

  useEffect(() => {
    // Request notification permission on mount
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }

    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'complete') => {
    let reason = "";
    if (action === 'reject') {
      const res = prompt("Alasan Pembatalan (Salah Input, Pemain Batal, dll):");
      if (res === null) return;
      reason = res || "Dibatalkan Admin";
    } else if (action === 'complete') {
      if (!confirm("Selesaikan billing ini?")) return;
    } else if (action === 'approve') {
      if (!confirm("Approve booking ini dan izinkan main?")) return;
    }

    setLoadingId(id);
    await fetch(`/api/bookings/${id}`, {
      method: "PUT",
      body: JSON.stringify({ action, reason })
    });
    await loadData();
    setLoadingId(null);
  };

  const handleEditClick = (b: Booking) => {
    setEditBookingId(b.id);
    const pcName = db?.pcs?.find(p => p.id === b.pc_id)?.name || "";
    setManualData({ playerName: b.player_name, pcId: b.pc_id, searchPc: pcName });
    setSelectedPaket(b.paket_id);
    const pkg = db?.pakets?.find(p => p.id === b.paket_id);
    setSearchPaket(pkg ? pkg.price.toString() : ""); // Pre-fill search with price so it shows up
    setShowManual(true);
  };

  const showBukti = (base64: string | undefined) => {
    if (!base64) return alert("User tidak mengupload bukti bayar!");
    setBuktiImage(base64);
  };

  if (!db) return <div className="p-8 tracking-tight text-white/50 text-xs">LOADING DATA...</div>;

  return (
    <div className="bg-surface-dark p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-hairline">
          <div className="flex items-center gap-4">
            <Database size={32} className="text-nvidia-green" weight="fill" />
            <div>
              <h1 className="text-3xl font-bold text-white uppercase tracking-tight tracking-tight">Data Antrean & Booking</h1>
              <p className="text-white/60 tracking-tight text-sm mt-1">&gt; VERIFIKASI QRIS & APPROVE PC</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setEditBookingId(null);
              setManualData({ playerName: "", pcId: "", searchPc: "" });
              setSearchPaket("");
              setSelectedPaket(null);
              setShowManual(true);
            }}
            className="nvidia-button text-sm uppercase tracking-widest px-6"
          >
            + TAMBAH BOOKING MANUAL
          </button>
        </div>

        <div className="nvidia-card overflow-hidden">
          <div className="nvidia-corner"></div>

          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left tracking-tight whitespace-nowrap">
              <thead className="bg-surface-soft text-white/50 text-[11px] uppercase border-b border-hairline">
                <tr>
                  <th className="p-4 font-bold border-r border-hairline w-16">Status</th>
                  <th className="p-4 font-bold border-r border-hairline">Pemain</th>
                  <th className="p-4 font-bold border-r border-hairline">Target PC</th>
                  <th className="p-4 font-bold border-r border-hairline">Paket / Tarif</th>
                  <th className="p-4 font-bold border-r border-hairline">Waktu Booking</th>
                  <th className="p-4 font-bold text-center">Aksi / Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline bg-surface-dark text-sm">
                {db.bookings?.map((b) => {
                  const pc = db.pcs.find((p: PC) => p.id === b.pc_id);
                  const pkg = db.pakets.find((p: Paket) => p.id === b.paket_id);

                  return (
                    <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 border-r border-hairline">
                        <div className="flex justify-center">
                          {b.status === "pending" ? (
                            <Clock size={20} className="text-warning-bright animate-pulse" />
                          ) : (
                            <CheckCircle size={20} className="text-nvidia-green" weight="fill" />
                          )}
                        </div>
                      </td>
                      <td className="p-4 border-r border-hairline text-white font-bold">
                        {b.player_name}
                      </td>
                      <td className="p-4 border-r border-hairline text-nvidia-green font-bold">
                        {pc?.name || b.pc_id}
                      </td>
                      <td className="p-4 border-r border-hairline text-white/70">
                        {pkg?.name} <span className="text-[10px] ml-2 font-bold text-white/40">RP {pkg?.price?.toLocaleString("id-ID")}</span>
                      </td>
                      <td className="p-4 border-r border-hairline text-white/50 text-xs">
                        {new Date(b.created_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3 md:p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {b.status === "pending" && (
                            <>
                              <button 
                                onClick={() => showBukti(b.ss_bukti)}
                                className="px-3 py-2 border border-hairline text-white/70 hover:text-white hover:border-white/50 text-[10px] font-bold uppercase flex items-center gap-1 transition-colors min-h-[36px]"
                              >
                                <FileImage size={14} /> Cek Bukti
                              </button>
                              <button 
                                disabled={loadingId === b.id}
                                onClick={() => handleAction(b.id, 'approve')}
                                className="px-3 py-2 bg-nvidia-green text-black hover:bg-[#88d600] text-[10px] font-bold uppercase transition-colors min-h-[36px]"
                              >
                                Approve
                              </button>
                              <button 
                                disabled={loadingId === b.id}
                                onClick={() => handleAction(b.id, 'reject')}
                                className="px-3 py-2 text-error-deep border border-error-deep hover:bg-error-deep hover:text-white text-[10px] font-bold uppercase transition-colors min-h-[36px]"
                              >
                                Batal
                              </button>
                            </>
                          )}
                          {b.status === "active" && (
                            <>
                              <span className="text-[10px] text-nvidia-green font-bold uppercase px-3 py-2 border border-nvidia-green/30 bg-nvidia-green/10 min-h-[36px] flex items-center">
                                ANTREAN AKTIF
                              </span>
                              <button 
                                disabled={loadingId === b.id}
                                onClick={() => handleEditClick(b)}
                                className="px-3 py-2 bg-nvidia-green/10 text-nvidia-green hover:bg-nvidia-green hover:text-black text-[10px] font-bold uppercase transition-colors border border-nvidia-green/30 min-h-[36px]"
                              >
                                EDIT
                              </button>
                              <button 
                                disabled={loadingId === b.id}
                                onClick={() => handleAction(b.id, 'complete')}
                                className="px-3 py-2 bg-surface-soft text-white hover:bg-white hover:text-black text-[10px] font-bold uppercase transition-colors border border-hairline min-h-[36px]"
                              >
                                SELESAI
                              </button>
                              
                              <div className="flex items-stretch ml-2 border border-hairline rounded-[2px] overflow-hidden">
                                <input 
                                  type="text"
                                  id={`sync-waktu-${b.id}`}
                                  placeholder="Contoh: 1j 30m"
                                  className="w-28 bg-surface-dark px-2 py-1 text-[10px] text-white focus:border-nvidia-green outline-none"
                                />
                                <button 
                                  onClick={async () => {
                                    const input = document.getElementById(`sync-waktu-${b.id}`) as HTMLInputElement;
                                    const query = input.value.toLowerCase().trim();
                                    if (!query) return;

                                    let val = 0;
                                    const timeStr = query.replace(/jam/g, 'j').replace(/menit/g, 'm').replace(/[^0-9jm]/g, '');
                                    if (timeStr.includes('j')) {
                                      const h = parseInt(timeStr.split('j')[0]) || 0;
                                      const m = parseInt(timeStr.split('j')[1]?.split('m')[0]) || 0;
                                      val = (h * 60) + m;
                                    } else if (timeStr.includes('m')) {
                                      val = parseInt(timeStr.split('m')[0]) || 0;
                                    } else {
                                      val = parseInt(timeStr) || 0;
                                    }
                                    
                                    setLoadingId(b.id);
                                    const newDb = { ...db };
                                    const pcIndex = newDb.pcs.findIndex(p => p.id === b.pc_id);
                                    if (pcIndex !== -1) {
                                      if (val > 0) {
                                        newDb.pcs[pcIndex].expected_empty_time = new Date(Date.now() + val * 60000).toISOString();
                                      } else {
                                        newDb.pcs[pcIndex].expected_empty_time = "";
                                      }
                                      await fetch("/api/data", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify(newDb)
                                      });
                                      input.value = "";
                                      await loadData();
                                    }
                                    setLoadingId(null);
                                  }}
                                  disabled={loadingId === b.id}
                                  className="bg-nvidia-green text-black px-3 py-1 text-[10px] font-bold uppercase hover:bg-[#88d600] disabled:opacity-50"
                                >
                                  SET
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(!db.bookings || db.bookings.length === 0) && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-white/30 text-xs uppercase font-bold">
                      TIDAK ADA ANTREAN ATAU PC AKTIF SAAT INI
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden flex flex-col divide-y divide-hairline bg-surface-dark">
            {db.bookings?.map((b) => {
              const pc = db.pcs.find((p: PC) => p.id === b.pc_id);
              const pkg = db.pakets.find((p: Paket) => p.id === b.paket_id);

              return (
                <div key={b.id} className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {b.status === "pending" ? (
                        <Clock size={18} className="text-warning-bright animate-pulse" />
                      ) : (
                        <CheckCircle size={18} className="text-nvidia-green" weight="fill" />
                      )}
                      <span className="font-bold text-white tracking-tight">{b.player_name}</span>
                    </div>
                    <span className="text-white/50 text-[10px] tracking-tight">
                      {new Date(b.created_at).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs tracking-tight bg-black/40 p-2 rounded-[2px] border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-white/40 text-[10px] uppercase">Target PC</span>
                      <span className="text-nvidia-green font-bold">{pc?.name || b.pc_id}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-white/40 text-[10px] uppercase">Paket / Tarif</span>
                      <span className="text-white/80">{pkg?.name}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {b.status === "pending" && (
                      <>
                        <button 
                          onClick={() => showBukti(b.ss_bukti)}
                          className="flex-1 px-3 py-2 border border-hairline text-white/70 text-[10px] font-bold uppercase flex items-center justify-center gap-1"
                        >
                          <FileImage size={14} /> Bukti
                        </button>
                        <button 
                          disabled={loadingId === b.id}
                          onClick={() => handleAction(b.id, 'approve')}
                          className="flex-1 px-3 py-2 bg-nvidia-green text-black text-[10px] font-bold uppercase"
                        >
                          Approve
                        </button>
                        <button 
                          disabled={loadingId === b.id}
                          onClick={() => handleAction(b.id, 'reject')}
                          className="flex-1 px-3 py-2 text-error-deep border border-error-deep text-[10px] font-bold uppercase"
                        >
                          Batal
                        </button>
                      </>
                    )}
                    {b.status === "active" && (
                      <div className="w-full flex flex-col gap-2">
                        <div className="flex gap-2">
                          <span className="flex-1 text-[10px] text-nvidia-green font-bold uppercase px-2 py-2 border border-nvidia-green/30 bg-nvidia-green/10 flex items-center justify-center">
                            AKTIF
                          </span>
                          <button 
                            disabled={loadingId === b.id}
                            onClick={() => handleEditClick(b)}
                            className="px-4 py-2 bg-nvidia-green/10 text-nvidia-green text-[10px] font-bold uppercase border border-nvidia-green/30"
                          >
                            EDIT
                          </button>
                          <button 
                            disabled={loadingId === b.id}
                            onClick={() => handleAction(b.id, 'complete')}
                            className="px-4 py-2 bg-surface-soft text-white text-[10px] font-bold uppercase border border-hairline"
                          >
                            SELESAI
                          </button>
                        </div>
                        <div className="flex items-stretch border border-hairline rounded-[2px] overflow-hidden w-full">
                          <input 
                            type="text"
                            id={`sync-waktu-mobile-${b.id}`}
                            placeholder="Set Sisa Waktu (1j 30m)"
                            className="flex-1 bg-surface-dark px-3 py-2 text-[10px] text-white focus:border-nvidia-green outline-none"
                          />
                          <button 
                            onClick={async () => {
                              const input = document.getElementById(`sync-waktu-mobile-${b.id}`) as HTMLInputElement;
                              const query = input.value.toLowerCase().trim();
                              if (!query) return;

                              let val = 0;
                              const timeStr = query.replace(/jam/g, 'j').replace(/menit/g, 'm').replace(/[^0-9jm]/g, '');
                              if (timeStr.includes('j')) {
                                const h = parseInt(timeStr.split('j')[0]) || 0;
                                const m = parseInt(timeStr.split('j')[1]?.split('m')[0]) || 0;
                                val = (h * 60) + m;
                              } else if (timeStr.includes('m')) {
                                val = parseInt(timeStr.split('m')[0]) || 0;
                              } else {
                                val = parseInt(timeStr) || 0;
                              }
                              
                              setLoadingId(b.id);
                              const newDb = { ...db };
                              const pcIndex = newDb.pcs.findIndex(p => p.id === b.pc_id);
                              if (pcIndex !== -1) {
                                if (val > 0) {
                                  newDb.pcs[pcIndex].expected_empty_time = new Date(Date.now() + val * 60000).toISOString();
                                } else {
                                  newDb.pcs[pcIndex].expected_empty_time = "";
                                }
                                await fetch("/api/data", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify(newDb)
                                });
                                input.value = "";
                                await loadData();
                              }
                              setLoadingId(null);
                            }}
                            disabled={loadingId === b.id}
                            className="bg-nvidia-green text-black px-4 py-2 text-[10px] font-bold uppercase disabled:opacity-50"
                          >
                            SET
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* Manual Booking / Edit Modal */}
      {showManual && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-hairline p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold tracking-tight text-white mb-4 uppercase">{editBookingId ? "Ubah Data Booking" : "Booking Kasir (Walk-in)"}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-white/50 uppercase tracking-tight">Nama Pemain (Opsional)</label>
                <input 
                  id="admin-nama"
                  type="text" 
                  value={manualData.playerName} 
                  onChange={e => setManualData({...manualData, playerName: e.target.value})} 
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('admin-pc')?.focus(); } }}
                  placeholder="e.g. Bang Jago" 
                  className="w-full bg-surface-dark border border-hairline p-2 text-sm text-white tracking-tight outline-none focus:border-nvidia-green" 
                />
              </div>
              <div className="relative">
                <label className="text-[10px] text-white/50 uppercase tracking-tight">Cari / Pilih PC</label>
                <input 
                  id="admin-pc"
                  type="text" 
                  value={manualData.searchPc} 
                  onChange={e => {
                     const val = e.target.value;
                     setManualData({...manualData, searchPc: val, pcId: ""}); // reset pcId when typing
                     setShowPcList(true);
                  }}
                  onKeyDown={e => {
                     if (e.key === 'Enter') {
                        e.preventDefault();
                        const matched = db?.pcs?.find(p => p.name.toLowerCase().includes(manualData.searchPc.toLowerCase()));
                        if (matched) {
                           setManualData({...manualData, pcId: matched.id, searchPc: matched.name});
                           setShowPcList(false);
                           document.getElementById('admin-paket')?.focus();
                        }
                     }
                  }}
                  onFocus={() => setShowPcList(true)}
                  onBlur={() => setTimeout(() => setShowPcList(false), 200)}
                  placeholder="Ketik PC, misal PC 01 (Lalu Enter)" 
                  className="w-full bg-surface-dark border border-hairline p-2 text-sm text-white tracking-tight outline-none focus:border-nvidia-green" 
                />
                {showPcList && (
                  <div className="absolute z-[110] left-0 right-0 top-full mt-1 bg-surface-dark border border-hairline max-h-40 overflow-y-auto custom-scrollbar">
                    {db?.pcs?.filter(p => p.name.toLowerCase().includes(manualData.searchPc.toLowerCase())).map(pc => (
                      <button 
                        key={pc.id}
                        onMouseDown={() => {
                          setManualData({...manualData, pcId: pc.id, searchPc: pc.name});
                          setShowPcList(false);
                        }}
                        className={`w-full text-left p-2 text-sm tracking-tight hover:bg-nvidia-green/20 ${manualData.pcId === pc.id ? 'bg-nvidia-green/10 text-nvidia-green' : 'text-white'}`}
                      >
                        {pc.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col h-[280px]">
                <label className="text-[10px] text-white/50 uppercase tracking-tight mb-1">Cari / Bikin Paket Billing</label>
                <input
                  id="admin-paket"
                  type="text"
                  value={searchPaket}
                  onChange={e => setSearchPaket(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('admin-simpan')?.focus(); } }}
                  placeholder="e.g. 6000 atau Paket Malam"
                  className="w-full bg-surface-dark border border-hairline p-2 text-sm text-white tracking-tight outline-none focus:border-nvidia-green shrink-0 mb-2"
                />
                <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar">
                  {(() => {
                    const query = debouncedSearch.toLowerCase();
                    let customPkg = null;
                    let parsedPrice = 0;
                    let isTimeInput = false;

                    if (query) {
                      if (query.includes('jam') || query.includes('menit') || query.includes('m') || query.includes('j')) {
                        isTimeInput = true;
                        const timeStr = query.replace(/jam/g, 'j').replace(/menit/g, 'm').replace(/[^0-9jm]/g, '');
                        let totalMinutes = 0;
                        if (timeStr.includes('j')) {
                          const h = parseInt(timeStr.split('j')[0]) || 0;
                          const m = parseInt(timeStr.split('j')[1]?.split('m')[0]) || 0;
                          totalMinutes = (h * 60) + m;
                        } else if (timeStr.includes('m')) {
                          totalMinutes = parseInt(timeStr.split('m')[0]) || 0;
                        } else {
                          totalMinutes = parseInt(timeStr) || 0;
                        }
                        if (totalMinutes > 0) {
                          parsedPrice = Math.ceil(totalMinutes / 60 * 4000);
                        }
                      } else {
                        parsedPrice = parseInt(query.replace(/\D/g, '')) || 0;
                      }
                    }

                    const filtered = (db?.pakets || []).filter(p =>
                      !p.is_custom && (p.name.toLowerCase().includes(query) || p.price.toString().includes(query) || (parsedPrice > 0 && p.price === parsedPrice))
                    );

                    if (query && parsedPrice >= 3000) {
                        const hasExactMatch = (db?.pakets || []).some(p => !p.is_custom && p.price === parsedPrice);
                        if (!hasExactMatch) {
                          const totalMins = Math.floor(parsedPrice / 4000 * 60);
                          const h = Math.floor(totalMins / 60);
                          const m = totalMins % 60;
                          const timeStr = [h > 0 ? `${h}j` : '', m > 0 ? `${m}m` : ''].filter(Boolean).join(' ') || '0m';
                          customPkg = {
                            id: `custom-${parsedPrice}`,
                            name: `Paket Custom (± ${timeStr})`,
                            price: parsedPrice
                          };
                        }
                      }

                    const displayPkgs = customPkg ? [customPkg, ...filtered] : filtered;

                    if (displayPkgs.length === 0) {
                      return (
                        <div className="p-4 text-center text-white/40 tracking-tight text-xs border border-dashed border-white/10">
                          {(parsedPrice > 0 && parsedPrice < 3000)
                            ? "Minimal Rp 3.000 boss"
                            : "Paket nggak ketemu"}
                        </div>
                      );
                    }

                    return displayPkgs.map((pkg) => {
                      const isSelected = selectedPaket === pkg.id;
                      const isCustom = pkg.id.startsWith('custom-');
                      return (
                        <button
                          key={pkg.id}
                          onClick={() => setSelectedPaket(pkg.id)}
                          className={`
                              relative group flex items-center justify-between p-3 tracking-tight transition-all duration-300 w-full overflow-hidden outline-none shrink-0 border
                              ${isSelected
                              ? "bg-nvidia-green/10 border-nvidia-green/50 shadow-[0_0_15px_rgba(118,185,0,0.15)]"
                              : isCustom ? "bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50" : "bg-black/40 border-white/5 hover:border-white/20 hover:bg-black/60"
                            }
                            `}
                        >
                          {isSelected && (
                            <motion.div
                              layoutId="admin-paket-highlight"
                              className="absolute inset-0 bg-nvidia-green/10 pointer-events-none"
                              initial={false}
                              transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                          )}
                          <div className="flex flex-col items-start relative z-10">
                            <span className={`text-[10px] md:text-xs font-bold tracking-tight uppercase ${isSelected ? "text-nvidia-green drop-shadow-[0_0_8px_rgba(118,185,0,0.8)]" : isCustom ? "text-blue-400" : "text-white/70 group-hover:text-white"} transition-all duration-300`}>
                              {pkg.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 relative z-10">
                            <span className={`text-[10px] font-bold ${isSelected ? "text-nvidia-green" : "text-white/40 group-hover:text-white/80"} transition-colors`}>
                              RP {pkg.price.toLocaleString("id-ID")}
                            </span>
                            <div className={`w-3 h-3 rounded-full border flex items-center justify-center transition-all duration-300 ${isSelected ? "border-nvidia-green bg-nvidia-green/20" : "border-white/20 group-hover:border-white/40"}`}>
                              {isSelected && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className="w-1.5 h-1.5 bg-nvidia-green rounded-full shadow-[0_0_8px_rgba(118,185,0,1)]" />}
                            </div>
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4 tracking-tight">
                <button 
                  disabled={loadingId === 'manual-loading'} 
                  onClick={() => {
                    setShowManual(false);
                    setEditBookingId(null);
                    setManualData({ playerName: "", pcId: "", searchPc: "" });
                    setSearchPaket("");
                    setSelectedPaket(null);
                  }} 
                  className="px-4 py-2 border border-hairline text-white/50 hover:text-white text-xs"
                >
                  BATAL
                </button>
                <button 
                  id="admin-simpan"
                  disabled={loadingId === 'manual-loading'} 
                  onClick={handleManualSubmit} 
                  className="px-4 py-2 bg-nvidia-green text-black font-bold text-xs hover:bg-[#88d600]"
                >
                  {loadingId === 'manual-loading' ? 'LOADING...' : (editBookingId ? 'SIMPAN PERUBAHAN' : 'SIMPAN (LANGSUNG MAIN)')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bukti Transfer */}
      {buktiImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="relative max-w-[90vw] w-full flex flex-col items-center justify-center">
            <button 
              onClick={() => setBuktiImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-error font-bold uppercase tracking-widest text-xs"
            >
              [ TUTUP ]
            </button>
            <img src={buktiImage} alt="Bukti Transfer" className="max-w-full max-h-[90vh] object-contain border border-nvidia-green/30 rounded-[2px]" />
          </div>
        </div>
      )}
    </div>
  );
}
