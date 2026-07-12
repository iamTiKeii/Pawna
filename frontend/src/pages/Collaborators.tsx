import React, { useEffect, useState } from "react";
import axios from "axios";
import { Plus, Search, Edit3, ShieldAlert, Trash2, X, Lock, Unlock } from "lucide-react";
import { toast } from "../lib/toast";

interface Collaborator {
  id: string;
  full_name: string;
  code: string;
  phone?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_holder?: string;
  status: string; // "active" | "inactive"
  created_at: string;
}

export const Collaborators: React.FC = () => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active"); // Default to "Hoạt động" (active) matching Image 1

  // VietQR Banks API list
  const [banksList, setBanksList] = useState<string[]>([]);

  // Modals visibility
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeactivateConfirmOpen, setIsDeactivateConfirmOpen] = useState(false);

  // Form states
  const [selectedId, setSelectedId] = useState("");
  const [fullName, setFullName] = useState("");
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [status, setStatus] = useState("active");

  // State for collaborator being locked/unlocked
  const [targetCollab, setTargetCollab] = useState<Collaborator | null>(null);

  // Fetch collaborators list
  const fetchCollaborators = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter) params.append("status", statusFilter);

      const res = await axios.get(`/api/collaborators?${params.toString()}`);
      setCollaborators(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Không thể tải danh sách cộng tác viên.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch VietQR banks list
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const res = await axios.get("https://api.vietqr.io/v2/banks");
        if (res.data && res.data.code === "00") {
          const names = res.data.data.map((b: any) => b.name);
          setBanksList(names);
        }
      } catch (err) {
        console.error("Error loading VietQR banks list:", err);
      }
    };
    fetchBanks();
  }, []);

  // Fetch list when status selection filter changes
  useEffect(() => {
    fetchCollaborators();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCollaborators();
  };

  const handleOpenCreate = () => {
    setFullName("");
    setCode("");
    setPhone("");
    setBankName("");
    setBankAccountNumber("");
    setBankAccountHolder("");
    setStatus("active");
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (c: Collaborator) => {
    setSelectedId(c.id);
    setFullName(c.full_name);
    setCode(c.code);
    setPhone(c.phone || "");
    setBankName(c.bank_name || "");
    setBankAccountNumber(c.bank_account_number || "");
    setBankAccountHolder(c.bank_account_holder || "");
    setStatus(c.status);
    setIsEditOpen(true);
  };

  const handleOpenDeactivate = (c: Collaborator) => {
    setTargetCollab(c);
    setIsDeactivateConfirmOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !code) {
      toast.warning("Vui lòng nhập đầy đủ các thông tin bắt buộc (*)");
      return;
    }

    try {
      await axios.post("/api/collaborators", {
        full_name: fullName,
        code,
        phone: phone || null,
        bank_name: bankName || null,
        bank_account_number: bankAccountNumber || null,
        bank_account_holder: bankAccountHolder || null,
        status: "active",
      });
      toast.success("Thêm cộng tác viên mới thành công!");
      setIsCreateOpen(false);
      fetchCollaborators();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Không thể tạo cộng tác viên mới.");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !code) {
      toast.warning("Vui lòng nhập đầy đủ các thông tin bắt buộc (*)");
      return;
    }

    try {
      await axios.put(`/api/collaborators/${selectedId}`, {
        full_name: fullName,
        code,
        phone: phone || null,
        bank_name: bankName || null,
        bank_account_number: bankAccountNumber || null,
        bank_account_holder: bankAccountHolder || null,
        status,
      });
      toast.success("Cập nhật thông tin cộng tác viên thành công!");
      setIsEditOpen(false);
      fetchCollaborators();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Không thể cập nhật cộng tác viên.");
    }
  };

  const handleToggleStatusSubmit = async () => {
    if (!targetCollab) return;
    try {
      const newStatus = targetCollab.status === "active" ? "inactive" : "active";
      await axios.put(`/api/collaborators/${targetCollab.id}`, {
        status: newStatus,
      });
      toast.success(
        newStatus === "active"
          ? `Đã kích hoạt hoạt động cho cộng tác viên ${targetCollab.full_name}!`
          : `Đã vô hiệu hóa hoạt động cho cộng tác viên ${targetCollab.full_name}!`
      );
      setIsDeactivateConfirmOpen(false);
      setTargetCollab(null);
      fetchCollaborators();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Không thể đổi trạng thái hoạt động của cộng tác viên.");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn hồ sơ cộng tác viên ${name}?`)) return;
    try {
      await axios.delete(`/api/collaborators/${id}`);
      toast.success(`Đã xóa cộng tác viên ${name} thành công!`);
      fetchCollaborators();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Không thể xóa cộng tác viên.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Title Header */}
      <div className="flex justify-between items-center py-2">
        <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">
          Cộng tác viên
        </h2>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white border border-slate-150 p-4 rounded-2xl shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3 items-center w-full">
          {/* Search text query */}
          <div className="relative flex-1 w-full md:w-auto">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm tên"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-bordered input-sm w-full pl-9 bg-white border-slate-200 text-slate-800 focus:outline-none focus:border-amber-500 text-xs rounded-lg h-[32px]"
            />
          </div>

          {/* Status select dropdown */}
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select select-bordered select-sm w-full bg-white border-slate-200 text-slate-800 text-xs rounded-lg h-[32px] min-h-[32px]"
            >
              <option value="active">Hoạt động</option>
              <option value="inactive">Vô hiệu hóa</option>
            </select>
          </div>

          {/* Search trigger button (hidden but submits on enter) */}
          <button type="submit" className="hidden" />

          {/* Add collaborator button */}
          <button
            type="button"
            onClick={handleOpenCreate}
            className="btn btn-primary bg-[#0fbc98] hover:bg-[#0da686] border-none text-white btn-sm text-xs font-bold gap-1 rounded-lg px-4 w-full md:w-auto ml-auto"
          >
            <Plus className="w-4 h-4" />
            Thêm mới
          </button>
        </form>
      </div>

      {/* Table view of Collaborators */}
      {loading ? (
        <div className="flex justify-center p-12 bg-white border border-slate-150 rounded-2xl shadow-sm">
          <span className="loading loading-spinner loading-md text-amber-500"></span>
        </div>
      ) : collaborators.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-150 rounded-2xl text-slate-400 text-xs shadow-sm">
          Không có dữ liệu
        </div>
      ) : (
        <div className="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="table w-full text-slate-700 text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/85 text-slate-500 text-[10px] font-semibold">
                  <th className="w-12 text-center">#</th>
                  <th>Họ và tên</th>
                  <th className="w-32">Mã CTV</th>
                  <th className="w-48">Số điện thoại</th>
                  <th>Ngân hàng</th>
                  <th className="w-32">Tình trạng</th>
                  <th className="w-32 text-center">Chức năng</th>
                </tr>
              </thead>
              <tbody>
                {collaborators.map((c, idx) => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                    <td className="text-center font-medium text-slate-400">{idx + 1}</td>
                    <td className="font-semibold text-blue-600 hover:underline cursor-pointer" onClick={() => handleOpenEdit(c)}>
                      {c.full_name}
                    </td>
                    <td className="font-medium text-slate-700">{c.code}</td>
                    <td className="text-slate-600">{c.phone || "---"}</td>
                    <td className="text-slate-700">
                      {c.bank_name ? (
                        <>
                          <div className="font-medium">{c.bank_name} - {c.bank_account_number || "---"}</div>
                          <div className="text-[10px] text-slate-400 font-semibold">{c.bank_account_holder || "---"}</div>
                        </>
                      ) : (
                        "---"
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge border-none badge-sm text-[10px] font-bold py-2.5 px-3 rounded text-white ${
                          c.status === "active" ? "bg-[#0fbc98]" : "bg-red-400"
                        }`}
                      >
                        {c.status === "active" ? "Hoạt động" : "Vô hiệu hóa"}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Edit button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(c)}
                          className="btn btn-xs btn-ghost border border-blue-100 bg-blue-50/50 hover:bg-blue-100/80 text-blue-600 rounded p-1"
                          title="Chỉnh sửa"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {/* Status Lock/Unlock Toggle */}
                        <button
                          type="button"
                          onClick={() => handleOpenDeactivate(c)}
                          className={`btn btn-xs btn-ghost border rounded p-1 ${
                            c.status === "active"
                              ? "border-purple-100 bg-purple-50/50 hover:bg-purple-105 text-purple-600"
                              : "border-emerald-100 bg-emerald-50/50 hover:bg-emerald-105 text-emerald-600"
                          }`}
                          title={c.status === "active" ? "Vô hiệu hóa" : "Kích hoạt"}
                        >
                          {c.status === "active" ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id, c.full_name)}
                          className="btn btn-xs btn-ghost border border-red-100 bg-red-50/50 hover:bg-red-100/80 text-red-600 rounded p-1"
                          title="Xóa vĩnh viễn"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE MODAL (Image 2) */}
      {isCreateOpen && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-2xl max-w-lg p-0 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-805">Thêm cộng tác viên</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="btn btn-ghost btn-circle btn-xs text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-12 gap-y-4 items-center">
                {/* Full name */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Họ và tên <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    placeholder="Nhập tên cộng tác viên"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-850 text-xs rounded-lg"
                    required
                  />
                </div>

                {/* Collaborator code */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Mã CTV <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    placeholder="Nhập mã cộng tác viên"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-850 text-xs rounded-lg"
                    required
                  />
                </div>

                {/* Phone */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Số điện thoại
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    placeholder="Nhập số điện thoại"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-850 text-xs rounded-lg"
                  />
                </div>

                {/* Bank Combobox select list */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Ngân hàng
                </div>
                <div className="col-span-9">
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="select select-bordered select-sm w-full bg-white border-slate-200 text-slate-800 text-xs rounded-lg h-[32px] min-h-[32px]"
                  >
                    <option value="">Chọn ngân hàng</option>
                    {banksList.map((name, idx) => (
                      <option key={idx} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bank Account Number */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Số tài khoản
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    placeholder="Nhập số tài khoản"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-850 text-xs rounded-lg"
                  />
                </div>

                {/* Bank Account Holder */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Tên chủ tài khoản
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    placeholder="Nhập tên chủ tài khoản"
                    value={bankAccountHolder}
                    onChange={(e) => setBankAccountHolder(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-850 text-xs rounded-lg"
                  />
                </div>
              </div>

              {/* Action Submit */}
              <div className="flex justify-start pt-4 border-t border-slate-100 pl-[25%]">
                <button
                  type="submit"
                  className="btn btn-sm bg-[#0fbc98] hover:bg-[#0da686] border-none text-white font-bold rounded-lg px-8 text-xs"
                >
                  Thêm mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL (Image 3) */}
      {isEditOpen && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-2xl max-w-lg p-0 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-805">Cập nhật cộng tác viên</h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="btn btn-ghost btn-circle btn-xs text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-12 gap-y-4 items-center">
                {/* Full name */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Họ và tên <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    placeholder="Nhập tên cộng tác viên"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-850 text-xs rounded-lg"
                    required
                  />
                </div>

                {/* Collaborator code */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Mã CTV <span className="text-red-500">*</span>
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    placeholder="Nhập mã cộng tác viên"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-850 text-xs rounded-lg"
                    required
                  />
                </div>

                {/* Phone */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Số điện thoại
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    placeholder="Nhập số điện thoại"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-850 text-xs rounded-lg"
                  />
                </div>

                {/* Bank Combobox select list */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Ngân hàng
                </div>
                <div className="col-span-9">
                  <select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="select select-bordered select-sm w-full bg-white border-slate-200 text-slate-800 text-xs rounded-lg h-[32px] min-h-[32px]"
                  >
                    <option value="">Chọn ngân hàng</option>
                    {banksList.map((name, idx) => (
                      <option key={idx} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bank Account Number */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Số tài khoản
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    placeholder="Nhập số tài khoản"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-850 text-xs rounded-lg"
                  />
                </div>

                {/* Bank Account Holder */}
                <div className="col-span-3 text-right pr-4 text-xs font-semibold text-slate-600">
                  Tên chủ tài khoản
                </div>
                <div className="col-span-9">
                  <input
                    type="text"
                    placeholder="Nhập tên chủ tài khoản"
                    value={bankAccountHolder}
                    onChange={(e) => setBankAccountHolder(e.target.value)}
                    className="input input-bordered input-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-850 text-xs rounded-lg"
                  />
                </div>
              </div>

              {/* Action Submit */}
              <div className="flex justify-start pt-4 border-t border-slate-100 pl-[25%]">
                <button
                  type="submit"
                  className="btn btn-sm bg-[#0fbc98] hover:bg-[#0da686] border-none text-white font-bold rounded-lg px-8 text-xs"
                >
                  Cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DEACTIVATE MODAL (Image 4) */}
      {isDeactivateConfirmOpen && targetCollab && (
        <div className="modal modal-open">
          <div className="modal-box bg-white border border-slate-200 text-slate-800 rounded-2xl max-w-md p-6 relative shadow-2xl">
            {/* Close X button */}
            <button
              type="button"
              onClick={() => {
                setIsDeactivateConfirmOpen(false);
                setTargetCollab(null);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Warning Content */}
            <div className="flex flex-col items-center justify-center text-center space-y-4 pt-3">
              {/* Exclamation Warning Icon */}
              <div className="bg-amber-50 border border-amber-200 rounded-full p-3.5 flex items-center justify-center text-amber-500">
                <ShieldAlert className="w-8 h-8" />
              </div>

              {/* Query message */}
              <p className="text-sm font-semibold text-slate-800 max-w-sm">
                Bạn có chắc chắn muốn {targetCollab.status === "active" ? "vô hiệu hoá" : "kích hoạt hoạt động"} cộng tác viên{" "}
                <span className="text-red-600 font-bold">{targetCollab.full_name}</span> không?
              </p>

              {/* Modal Actions */}
              <div className="flex items-center gap-3 w-full justify-center pt-2">
                <button
                  type="button"
                  onClick={handleToggleStatusSubmit}
                  className={`btn btn-sm rounded-lg px-6 font-bold text-xs text-white border-none ${
                    targetCollab.status === "active"
                      ? "btn-error bg-red-600 hover:bg-red-700"
                      : "btn-success bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {targetCollab.status === "active" ? "Vô hiệu hoá" : "Kích hoạt"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDeactivateConfirmOpen(false);
                    setTargetCollab(null);
                  }}
                  className="btn btn-sm bg-slate-400 hover:bg-slate-500 border-none text-white rounded-lg px-6 font-bold text-xs"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
