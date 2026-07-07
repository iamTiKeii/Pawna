import React, { useEffect, useState } from "react";
import axios from "axios";
import { Plus, Search, Trash2, Edit, AlertCircle, Coins } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const CapitalContracts: React.FC = () => {
  const { activeStore } = useAuth();
  
  // States
  const [contracts, setContracts] = useState<any[]>([]);
  const [interestTypes, setInterestTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);

  // Form Fields
  const [investorName, setInvestorName] = useState("");
  const [investorIdCard, setInvestorIdCard] = useState("");
  const [investorPhone, setInvestorPhone] = useState("");
  const [investorAddress, setInvestorAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [investmentDate, setInvestmentDate] = useState("");
  const [interestTypeId, setInterestTypeId] = useState("");
  const [isUpfront, setIsUpfront] = useState(false);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("active");

  const fetchContracts = async () => {
    if (!activeStore) return;
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`/api/contracts/capital?search=${search}&status=${statusFilter}`);
      setContracts(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi khi tải danh sách hợp đồng góp vốn.");
    } finally {
      setLoading(false);
    }
  };

  const fetchInterestTypes = async () => {
    try {
      const res = await axios.get("/api/contracts/pawn/interest-types");
      setInterestTypes(res.data);
    } catch (err) {
      console.error("Error loading interest types", err);
    }
  };

  useEffect(() => {
    fetchContracts();
    fetchInterestTypes();
  }, [activeStore, search, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!investorName || !amount || !investmentDate) {
      setError("Vui lòng điền các trường bắt buộc.");
      return;
    }

    try {
      await axios.post("/api/contracts/capital", {
        investor_name: investorName,
        investor_id_card: investorIdCard || null,
        investor_phone: investorPhone || null,
        investor_address: investorAddress || null,
        amount: Number(amount),
        investment_date: investmentDate,
        interest_type_id: interestTypeId || null,
        is_upfront_interest: isUpfront,
        notes,
      });

      setIsCreateOpen(false);
      resetForm();
      fetchContracts();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi tạo hợp đồng góp vốn.");
    }
  };

  const handleEditInit = (contract: any) => {
    setSelectedContract(contract);
    setInvestorName(contract.investor_name);
    setInvestorIdCard(contract.investor_id_card || "");
    setInvestorPhone(contract.investor_phone || "");
    setInvestorAddress(contract.investor_address || "");
    setAmount(Number(contract.amount).toString());
    setInvestmentDate(contract.investment_date.split("T")[0]);
    setInterestTypeId(contract.interest_type_id || "");
    setIsUpfront(contract.is_upfront_interest);
    setNotes(contract.notes || "");
    setStatus(contract.status);
    setIsEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!investorName || !amount || !investmentDate) {
      setError("Vui lòng điền các trường bắt buộc.");
      return;
    }

    try {
      await axios.put(`/api/contracts/capital/${selectedContract.id}`, {
        investor_name: investorName,
        investor_id_card: investorIdCard || null,
        investor_phone: investorPhone || null,
        investor_address: investorAddress || null,
        amount: Number(amount),
        investment_date: investmentDate,
        interest_type_id: interestTypeId || null,
        is_upfront_interest: isUpfront,
        notes,
        status,
      });

      setIsEditOpen(false);
      resetForm();
      fetchContracts();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi cập nhật hợp đồng góp vốn.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy/xóa hợp đồng góp vốn này? Tiền két sẽ được khấu trừ tự động.")) return;
    try {
      await axios.delete(`/api/contracts/capital/${id}`);
      fetchContracts();
    } catch (err: any) {
      setError(err.response?.data?.error || "Lỗi xóa hợp đồng.");
    }
  };

  const resetForm = () => {
    setInvestorName("");
    setInvestorIdCard("");
    setInvestorPhone("");
    setInvestorAddress("");
    setAmount("");
    setInvestmentDate("");
    setInterestTypeId("");
    setIsUpfront(false);
    setNotes("");
    setStatus("active");
    setSelectedContract(null);
  };

  const formatCurrency = (val: any) => {
    return Number(val || 0).toLocaleString("vi-VN") + " đ";
  };

  const totalCapital = contracts.reduce((sum, c) => sum + (c.status === "active" ? Number(c.amount) : 0), 0);

  return (
    <div className="space-y-6 p-2 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Hợp Đồng Góp Vốn
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Quản lý dòng vốn góp đầu tư từ đối tác, nhà đầu tư để bổ sung quỹ chi nhánh.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
          className="btn btn-warning bg-amber-500 hover:bg-amber-600 border-none text-slate-950 font-bold px-6 rounded-2xl flex items-center gap-2 shadow-lg shadow-amber-500/10"
        >
          <Plus className="w-5 h-5" />
          Thêm Hợp Đồng Góp Vốn
        </button>
      </div>

      {error && (
        <div className="alert alert-error bg-red-500/10 border-red-500/20 text-red-200 shadow-lg rounded-2xl flex gap-3">
          <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Stat */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/65 border border-slate-200/80 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden group col-span-1">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full transition-all duration-300 group-hover:scale-110" />
          <div className="p-3 bg-amber-500/10 rounded-2xl w-fit text-amber-500 mb-4">
            <Coins className="w-6 h-6" />
          </div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Tổng vốn góp hoạt động</p>
          <h2 className="text-3xl font-extrabold text-slate-800 mt-2">
            {formatCurrency(totalCapital)}
          </h2>
          <p className="text-slate-500 text-xs mt-1">Tính trên các hợp đồng đang hoạt động</p>
        </div>
      </div>

      {/* Table & Filtering */}
      <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 backdrop-blur-lg space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm nhà đầu tư..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input input-bordered w-full rounded-2xl bg-slate-50 border-slate-200/80 pl-12 text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select select-bordered rounded-2xl bg-slate-50 border-slate-200/80 text-slate-600 focus:border-amber-500"
            >
              <option value="">Trạng thái (Tất cả)</option>
              <option value="active">Đang hoạt động</option>
              <option value="completed">Đã tất toán</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg text-amber-500"></span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full text-slate-600">
              <thead>
                <tr className="border-b border-slate-200/80/60 text-slate-500">
                  <th>STT</th>
                  <th>Nhà Đầu Tư</th>
                  <th>Số Điện Thoại</th>
                  <th>Số Tiền</th>
                  <th>Ngày Góp</th>
                  <th>Loại Lãi Suất</th>
                  <th>Trạng Thái</th>
                  <th className="text-right">Chức Năng</th>
                </tr>
              </thead>
              <tbody>
                {contracts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-500">
                      Không tìm thấy hợp đồng góp vốn nào.
                    </td>
                  </tr>
                ) : (
                  contracts.map((c, idx) => (
                    <tr key={c.id} className="border-b border-slate-200/40 hover:bg-slate-50/50">
                      <td>{idx + 1}</td>
                      <td className="font-bold text-slate-800">{c.investor_name}</td>
                      <td>{c.investor_phone || "—"}</td>
                      <td className="text-amber-600 font-bold">{formatCurrency(c.amount)}</td>
                      <td>{new Date(c.investment_date).toLocaleDateString("vi-VN")}</td>
                      <td>
                        {c.interest_type ? c.interest_type.name : "Không tính lãi"}
                        {c.is_upfront_interest && <span className="badge badge-sm badge-outline badge-warning ml-1">Trả trước</span>}
                      </td>
                      <td>
                        <span
                          className={`badge badge-sm font-semibold rounded-lg px-2.5 py-1 ${
                            c.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : c.status === "completed"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-slate-50 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {c.status === "active" ? "Đang đầu tư" : c.status === "completed" ? "Đã trả xong" : "Đã hủy"}
                        </span>
                      </td>
                      <td className="text-right space-x-1.5">
                        <button
                          onClick={() => handleEditInit(c)}
                          className="btn btn-ghost btn-xs text-slate-500 hover:text-amber-500 rounded-lg p-1.5"
                        >
                          <Edit className="w-4.5 h-4.5" />
                        </button>
                        {c.status !== "cancelled" && (
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="btn btn-ghost btn-xs text-slate-500 hover:text-red-500 rounded-lg p-1.5"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 border border-slate-200/80 rounded-3xl max-w-2xl text-slate-700">
            <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2 mb-6">
              <Plus className="w-6 h-6 text-amber-500" />
              Thêm Mới Hợp Đồng Góp Vốn
            </h3>

            <form onSubmit={handleCreate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-slate-500 font-semibold">Tên Nhà Đầu Tư <span className="text-red-500">*</span></span>
                  </label>
                  <input
                    type="text"
                    value={investorName}
                    onChange={(e) => setInvestorName(e.target.value)}
                    required
                    className="input input-bordered rounded-2xl bg-slate-50 border-slate-200/80"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-slate-500 font-semibold">Số Số Tiền (VNĐ) <span className="text-red-500">*</span></span>
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="input input-bordered rounded-2xl bg-slate-50 border-slate-200/80"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-slate-500 font-semibold">Số CCCD / Hộ Chiếu</span>
                  </label>
                  <input
                    type="text"
                    value={investorIdCard}
                    onChange={(e) => setInvestorIdCard(e.target.value)}
                    className="input input-bordered rounded-2xl bg-slate-50 border-slate-200/80"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-slate-500 font-semibold">Số Điện Thoại</span>
                  </label>
                  <input
                    type="text"
                    value={investorPhone}
                    onChange={(e) => setInvestorPhone(e.target.value)}
                    className="input input-bordered rounded-2xl bg-slate-50 border-slate-200/80"
                  />
                </div>
                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text text-slate-500 font-semibold">Địa Chỉ</span>
                  </label>
                  <input
                    type="text"
                    value={investorAddress}
                    onChange={(e) => setInvestorAddress(e.target.value)}
                    className="input input-bordered rounded-2xl bg-slate-50 border-slate-200/80"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-slate-500 font-semibold">Ngày Góp Vốn <span className="text-red-500">*</span></span>
                  </label>
                  <input
                    type="date"
                    value={investmentDate}
                    onChange={(e) => setInvestmentDate(e.target.value)}
                    required
                    className="input input-bordered rounded-2xl bg-slate-50 border-slate-200/80"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-slate-500 font-semibold">Kế hoạch lãi suất</span>
                  </label>
                  <select
                    value={interestTypeId}
                    onChange={(e) => setInterestTypeId(e.target.value)}
                    className="select select-bordered rounded-2xl bg-slate-50 border-slate-200/80"
                  >
                    <option value="">Không tính lãi</option>
                    {interestTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-control flex flex-row items-center gap-3 md:col-span-2 mt-2">
                  <input
                    type="checkbox"
                    checked={isUpfront}
                    onChange={(e) => setIsUpfront(e.target.checked)}
                    className="checkbox checkbox-warning rounded-lg"
                  />
                  <span className="label-text text-slate-500 font-semibold">Trả lãi trước (Thu tiền lãi ngay lúc giải ngân)</span>
                </div>
                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text text-slate-500 font-semibold">Ghi Chú</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="textarea textarea-bordered rounded-2xl bg-slate-50 border-slate-200/80 h-20"
                  />
                </div>
              </div>

              <div className="modal-action gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="btn btn-outline border-slate-200/80 text-slate-500 rounded-2xl"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-warning bg-amber-500 hover:bg-amber-600 border-none text-slate-950 font-bold rounded-2xl px-6"
                >
                  Xác Nhận Tạo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 border border-slate-200/80 rounded-3xl max-w-2xl text-slate-700">
            <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2 mb-6">
              <Edit className="w-6 h-6 text-amber-500" />
              Chỉnh Sửa Hợp Đồng Góp Vốn
            </h3>

            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-slate-500 font-semibold">Tên Nhà Đầu Tư <span className="text-red-500">*</span></span>
                  </label>
                  <input
                    type="text"
                    value={investorName}
                    onChange={(e) => setInvestorName(e.target.value)}
                    required
                    className="input input-bordered rounded-2xl bg-slate-50 border-slate-200/80"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-slate-500 font-semibold">Số Số Tiền (VNĐ) <span className="text-red-500">*</span></span>
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="input input-bordered rounded-2xl bg-slate-50 border-slate-200/80"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-slate-500 font-semibold">Số CCCD / Hộ Chiếu</span>
                  </label>
                  <input
                    type="text"
                    value={investorIdCard}
                    onChange={(e) => setInvestorIdCard(e.target.value)}
                    className="input input-bordered rounded-2xl bg-slate-50 border-slate-200/80"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-slate-500 font-semibold">Số Điện Thoại</span>
                  </label>
                  <input
                    type="text"
                    value={investorPhone}
                    onChange={(e) => setInvestorPhone(e.target.value)}
                    className="input input-bordered rounded-2xl bg-slate-50 border-slate-200/80"
                  />
                </div>
                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text text-slate-500 font-semibold">Địa Chỉ</span>
                  </label>
                  <input
                    type="text"
                    value={investorAddress}
                    onChange={(e) => setInvestorAddress(e.target.value)}
                    className="input input-bordered rounded-2xl bg-slate-50 border-slate-200/80"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-slate-500 font-semibold">Ngày Góp Vốn <span className="text-red-500">*</span></span>
                  </label>
                  <input
                    type="date"
                    value={investmentDate}
                    onChange={(e) => setInvestmentDate(e.target.value)}
                    required
                    className="input input-bordered rounded-2xl bg-slate-50 border-slate-200/80"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-slate-500 font-semibold">Kế hoạch lãi suất</span>
                  </label>
                  <select
                    value={interestTypeId}
                    onChange={(e) => setInterestTypeId(e.target.value)}
                    className="select select-bordered rounded-2xl bg-slate-50 border-slate-200/80"
                  >
                    <option value="">Không tính lãi</option>
                    {interestTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-slate-500 font-semibold">Trạng Thái Hợp Đồng</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="select select-bordered rounded-2xl bg-slate-50 border-slate-200/80 text-slate-600"
                  >
                    <option value="active">Đang đầu tư (Hoạt động)</option>
                    <option value="completed">Đã tất toán (Trả xong)</option>
                    <option value="cancelled">Đã hủy/xóa</option>
                  </select>
                </div>
                <div className="form-control flex flex-row items-center gap-3 mt-4">
                  <input
                    type="checkbox"
                    checked={isUpfront}
                    onChange={(e) => setIsUpfront(e.target.checked)}
                    className="checkbox checkbox-warning rounded-lg"
                  />
                  <span className="label-text text-slate-500 font-semibold">Trả lãi trước</span>
                </div>
                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text text-slate-500 font-semibold">Ghi Chú</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="textarea textarea-bordered rounded-2xl bg-slate-50 border-slate-200/80 h-20"
                  />
                </div>
              </div>

              <div className="modal-action gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="btn btn-outline border-slate-200/80 text-slate-500 rounded-2xl"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn btn-warning bg-amber-500 hover:bg-amber-600 border-none text-slate-950 font-bold rounded-2xl px-6"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
