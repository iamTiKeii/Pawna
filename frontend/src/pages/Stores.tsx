import React, { useEffect, useState } from "react";
import axios from "axios";
import { 
  Plus, 
  ToggleLeft, 
  ToggleRight, 
  DollarSign, 
  Landmark, 
  RefreshCw, 
  Settings, 
  MapPin, 
  Phone, 
  Save, 
  X
} from "lucide-react";

interface Store {
  id: string;
  name: string;
  investment_capital: number;
  status: string;
  address?: string;
  phone?: string;
  notes?: string;
  created_at: string;
  _count?: {
    employees: number;
  };
}

export const Stores: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Create form state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [investmentCapital, setInvestmentCapital] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Capital Adjustment state
  const [isCapitalOpen, setIsCapitalOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [capitalAmount, setCapitalAmount] = useState("");
  const [capitalAction, setCapitalAction] = useState<"inject" | "withdraw">("inject");

  // Edit / Configuration state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const fetchStores = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get("/api/stores");
      setStores(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể tải danh sách chi nhánh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    try {
      setError("");
      setSuccess("");
      await axios.post("/api/stores", {
        name,
        investment_capital: Number(investmentCapital) || 0,
        address,
        phone,
        notes,
      });
      setSuccess("Tạo mới chi nhánh thành công!");
      setName("");
      setInvestmentCapital("");
      setAddress("");
      setPhone("");
      setNotes("");
      setIsCreateOpen(false);
      fetchStores();
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể tạo chi nhánh.");
    }
  };

  const handleToggleStatus = async (store: Store) => {
    const newStatus = store.status === "active" ? "inactive" : "active";
    try {
      setError("");
      setSuccess("");
      await axios.put(`/api/stores/${store.id}`, { status: newStatus });
      setSuccess(`Cập nhật trạng thái ${store.name} thành công!`);
      fetchStores();
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể cập nhật trạng thái chi nhánh.");
    }
  };

  const handleCapitalAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStore || !capitalAmount) return;

    try {
      setError("");
      setSuccess("");
      // Using existing capital adjust endpoints
      const endpoint = capitalAction === "inject" ? "inject-capital" : "withdraw-capital";
      await axios.post(`/api/stores/${selectedStore.id}/${endpoint}`, {
        amount: Number(capitalAmount),
      });
      setSuccess("Điều chỉnh vốn đầu tư chi nhánh thành công!");
      setCapitalAmount("");
      setIsCapitalOpen(false);
      setSelectedStore(null);
      fetchStores();
    } catch (err: any) {
      setError(err.response?.data?.error || "Không thể điều chỉnh vốn chi nhánh.");
    }
  };

  const handleSaveConfiguration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStore) return;

    try {
      setEditLoading(true);
      setError("");
      setSuccess("");
      await axios.put(`/api/stores/${selectedStore.id}`, {
        name: editName,
        phone: editPhone,
        address: editAddress,
        notes: editNotes,
      });
      setSuccess(`Cập nhật cấu hình chi nhánh ${editName} thành công!`);
      setIsEditOpen(false);
      setSelectedStore(null);
      fetchStores();
    } catch (err: any) {
      setError(err.response?.data?.error || "Cập nhật cấu hình chi nhánh thất bại.");
    } finally {
      setEditLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);
  };

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-200/80 p-6 rounded-3xl shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Landmark className="text-amber-500 w-7 h-7" />
            Quản Lý Chuỗi Chi Nhánh
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Thiết lập danh sách chi nhánh, quản trị luân chuyển vốn đầu tư ban đầu và cấu hình thông tin chi tiết.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={fetchStores} 
            className="btn btn-outline border-slate-200 hover:bg-slate-50 text-slate-600 btn-sm rounded-xl bg-white"
            type="button"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn btn-primary bg-amber-500 hover:bg-amber-600 border-none text-slate-950 btn-sm font-bold gap-1 rounded-xl shadow-sm shadow-amber-500/10 flex-1 sm:flex-none"
            type="button"
          >
            <Plus className="w-4 h-4" />
            Khai trương chi nhánh
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error text-xs p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 flex items-start gap-2 shadow-sm">
          <X className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success text-xs p-3 rounded-xl border border-green-200 bg-green-50 text-green-800 flex items-start gap-2 shadow-sm">
          <X className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-16">
          <span className="loading loading-spinner loading-lg text-amber-500"></span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((s) => (
            <div key={s.id} className="bg-white border border-slate-200/80 hover:border-amber-300 rounded-3xl p-6 flex flex-col justify-between shadow-sm transition-all duration-200 group">
              <div>
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 group-hover:text-amber-600 transition-colors">{s.name}</h3>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">ID: {s.id.substring(0, 8)}...</p>
                  </div>
                  <span className={`badge font-bold badge-xs py-2 uppercase border-none ${s.status === "active" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-500"}`}>
                    {s.status === "active" ? "Hoạt động" : "Tạm ngưng"}
                  </span>
                </div>
                
                <div className="mt-4 space-y-2.5 text-xs">
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-450">Vốn đầu tư:</span>
                    <span className="text-slate-800 font-extrabold">{formatCurrency(s.investment_capital)}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-1.5">
                    <span className="text-slate-450">Nhân sự:</span>
                    <span className="text-slate-800 font-bold">{s._count?.employees || 0} thành viên</span>
                  </div>
                  
                  {s.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{s.phone}</span>
                    </div>
                  )}
                  {s.address && (
                    <div className="flex items-start gap-2 text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{s.address}</span>
                    </div>
                  )}
                  {s.notes && (
                    <div className="bg-slate-50/50 text-[10px] text-slate-500 p-2.5 rounded-xl border border-slate-100 italic mt-2 line-clamp-3 leading-relaxed">
                      {s.notes}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    setSelectedStore(s);
                    setCapitalAction("inject");
                    setIsCapitalOpen(true);
                  }}
                  className="btn btn-outline border-slate-200 text-slate-700 btn-xs flex-1 hover:bg-slate-50 rounded-lg text-[10px] font-bold"
                  type="button"
                >
                  <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                  <span>Vốn</span>
                </button>
                
                <button
                  onClick={() => {
                    setSelectedStore(s);
                    setEditName(s.name || "");
                    setEditPhone(s.phone || "");
                    setEditAddress(s.address || "");
                    setEditNotes(s.notes || "");
                    setIsEditOpen(true);
                  }}
                  className="btn btn-outline border-slate-200 text-slate-700 btn-xs flex-1 hover:bg-slate-50 rounded-lg text-[10px] font-bold"
                  type="button"
                >
                  <Settings className="w-3.5 h-3.5 text-amber-500" />
                  <span>Cấu hình</span>
                </button>

                <button
                  onClick={() => handleToggleStatus(s)}
                  className={`btn btn-xs gap-1 w-full mt-1.5 font-bold rounded-lg ${
                    s.status === "active" 
                      ? "btn-neutral text-red-500 bg-red-50 border-red-100 hover:bg-red-100" 
                      : "btn-primary bg-amber-500 border-none text-slate-950 hover:bg-amber-600"
                  }`}
                  type="button"
                >
                  {s.status === "active" ? (
                    <>
                      <ToggleLeft className="w-4 h-4" /> <span>Tạm ngưng</span>
                    </>
                  ) : (
                    <>
                      <ToggleRight className="w-4 h-4" /> <span>Kích hoạt lại</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-3xl max-w-md shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2 mb-4">
              <Landmark className="w-5 h-5 text-amber-500" />
              Khai Trương Chi Nhánh Mới
            </h3>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label text-slate-600 font-bold text-xs py-1">Tên chi nhánh *</label>
                <input
                  type="text"
                  placeholder="Hùng Tín - Chi nhánh Gò Vấp"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label text-slate-600 font-bold text-xs py-1">Vốn đầu tư ban đầu (VNĐ)</label>
                  <input
                    type="number"
                    placeholder="1000000000"
                    value={investmentCapital}
                    onChange={(e) => setInvestmentCapital(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="label text-slate-600 font-bold text-xs py-1">Số điện thoại liên hệ</label>
                  <input
                    type="text"
                    placeholder="028..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="label text-slate-600 font-bold text-xs py-1">Địa chỉ chi tiết</label>
                <input
                  type="text"
                  placeholder="Số nhà, tên đường, phường..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="label text-slate-600 font-bold text-xs py-1">Ghi chú vận hành</label>
                <textarea
                  placeholder="Nhập ghi chú cho chi nhánh mới..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="textarea textarea-bordered textarea-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg text-xs h-20"
                />
              </div>

              <div className="modal-action border-t pt-4 mt-6">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="btn btn-outline border-slate-250 text-slate-600 btn-sm rounded-xl">
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary bg-amber-500 hover:bg-amber-600 border-none text-slate-950 btn-sm rounded-xl font-bold px-6">
                  Thêm mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CAPITAL ADJUSTMENT MODAL */}
      {isCapitalOpen && selectedStore && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-3xl max-w-md shadow-2xl p-6 relative">
            <button 
              onClick={() => { setIsCapitalOpen(false); setSelectedStore(null); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2 mb-1">
              <DollarSign className="w-5 h-5 text-amber-500" />
              Điều Chỉnh Vốn Đầu Tư
            </h3>
            <p className="text-slate-500 text-xs font-bold mb-4">Chi nhánh: <span className="text-amber-500 font-black">{selectedStore.name}</span></p>
            
            <form onSubmit={handleCapitalAdjust} className="space-y-4">
              <div>
                <label className="label text-slate-600 font-bold text-xs py-1">Hướng giao dịch</label>
                <select
                  value={capitalAction}
                  onChange={(e: any) => setCapitalAction(e.target.value)}
                  className="select select-bordered select-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg text-xs h-[32px] min-h-[32px]"
                >
                  <option value="inject">Rót thêm vốn đầu tư (+)</option>
                  <option value="withdraw">Rút bớt vốn đầu tư (-)</option>
                </select>
              </div>
              <div>
                <label className="label text-slate-600 font-bold text-xs py-1">Số tiền giao dịch (VNĐ) *</label>
                <input
                  type="number"
                  placeholder="Nhập số tiền cần điều chỉnh..."
                  value={capitalAmount}
                  onChange={(e) => setCapitalAmount(e.target.value)}
                  className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg text-xs"
                  required
                />
              </div>
              <div className="modal-action border-t pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsCapitalOpen(false);
                    setSelectedStore(null);
                  }}
                  className="btn btn-outline border-slate-250 text-slate-600 btn-sm rounded-xl"
                >
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary bg-amber-500 hover:bg-amber-600 border-none text-slate-950 btn-sm rounded-xl font-bold px-6">
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STORE CONFIGURATION / EDIT MODAL */}
      {isEditOpen && selectedStore && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-3xl max-w-md shadow-2xl p-6 relative">
            <button 
              onClick={() => { setIsEditOpen(false); setSelectedStore(null); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2 mb-1">
              <Settings className="w-5 h-5 text-amber-500" />
              Cấu Hình Chi Nhánh
            </h3>
            <p className="text-slate-500 text-xs font-semibold mb-4">Cập nhật thông tin chi tiết của cửa hàng.</p>

            <form onSubmit={handleSaveConfiguration} className="space-y-4">
              <div>
                <label className="label text-slate-600 font-bold text-xs py-1">Tên chi nhánh *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Tên chi nhánh..."
                  className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="label text-slate-600 font-bold text-xs py-1">Số điện thoại liên hệ *</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Số điện thoại..."
                  className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="label text-slate-600 font-bold text-xs py-1">Địa chỉ chi tiết *</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Địa chỉ..."
                  className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="label text-slate-600 font-bold text-xs py-1">Ghi chú vận hành</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Ghi chú chi nhánh..."
                  className="textarea textarea-bordered textarea-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg text-xs h-20"
                />
              </div>

              <div className="modal-action border-t pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditOpen(false);
                    setSelectedStore(null);
                  }}
                  className="btn btn-outline border-slate-250 text-slate-600 btn-sm rounded-xl"
                  disabled={editLoading}
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary bg-amber-500 hover:bg-amber-600 border-none text-slate-950 btn-sm rounded-xl font-bold px-6"
                  disabled={editLoading}
                >
                  {editLoading ? <span className="loading loading-spinner btn-xs"></span> : <Save className="w-4 h-4" />}
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
