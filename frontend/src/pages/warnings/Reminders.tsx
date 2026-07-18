import { ModalPortal } from "../../components/shared/ModalPortal";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Clock, Search, Plus, Trash2, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";
import { MoneyInput } from "../../components/shared/MoneyInput";
import { toast } from "../../lib/toast";

export const Reminders: React.FC = () => {
  const { activeStore } = useAuth();
  const confirm = useConfirm();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("");

  // Create Form State
  const [isOpen, setIsOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [contractCode, setContractCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [contractType, setContractType] = useState("pawn");
  const [loanAmount, setLoanAmount] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [content, setContent] = useState("");

  const fetchData = async () => {
    if (!activeStore) return;
    try {
      setLoading(true);
      const res = await axios.get(`/api/warnings/reminders?search=${search}&type=${selectedType}`);
      setList(res.data);
    } catch (err: any) {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeStore, search, selectedType]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentDate || !content) return;
    setFormLoading(true);
    setFormError("");

    try {
      await axios.post("/api/warnings/reminders", {
        contractCode,
        customerName,
        contractType,
        loanAmount: Number(loanAmount) || 0,
        appointmentDate: new Date(appointmentDate).toISOString(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        content,
      });
      toast.success("Tạo nhắc nhở thành công!");
      setIsOpen(false);
      // Reset form
      setContractCode("");
      setCustomerName("");
      setContractType("pawn");
      setLoanAmount("");
      setAppointmentDate("");
      setDueDate("");
      setContent("");
      fetchData();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || "Không thể tạo nhắc nhở hẹn giờ.";
      setFormError(errMsg);
      toast.error(errMsg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    confirm({
      title: "Xóa nhắc nhở",
      message: "Bạn có chắc chắn muốn xóa nhắc nhở này không?",
      type: "danger",
      event: e,
      onConfirm: async () => {
        await axios.delete(`/api/warnings/reminders/${id}`);
        fetchData();
      },
      successMessage: "Đã xóa nhắc nhở thành công.",
    });
  };

  const handleResolve = async (id: string) => {
    try {
      await axios.put(`/api/warnings/reminders/${id}/resolve`);
      toast.success("Đã xử lý nhắc nhở thành công!");
      fetchData();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || "Không thể cập nhật trạng thái nhắc nhở.";
      toast.error(errMsg);
    }
  };

  const formatCurrency = (val: any) => {
    return Number(val || 0).toLocaleString("vi-VN") + " đ";
  };

  const formatDate = (val: any) => {
    if (!val) return "N/A";
    return new Date(val).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getContractTypeLabel = (type: string) => {
    switch (type) {
      case "pawn": return "Cầm đồ";
      case "unsecured": return "Tín chấp";
      case "installment": return "Trả góp";
      default: return type;
    }
  };

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit uppercase">
            <Clock className="w-3.5 h-3.5" />
            <span>Hẹn giờ</span>
          </span>
          <h1 className="text-2xl font-black text-slate-800 mt-2">Thông Báo Hẹn Giờ</h1>
          <p className="text-slate-500 text-xs mt-0.5">Danh sách cuộc gọi hẹn nhắc nợ, lịch hẹn khách hàng hoặc hẹn giờ giải quyết hợp đồng quá hạn.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsOpen(true)}
            className="btn btn-primary text-white btn-sm gap-1.5 rounded-xl shadow-sm shadow-amber-500/20"
            type="button"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo cuộc hẹn</span>
          </button>
          <button 
            onClick={fetchData}
            className="btn btn-outline border-slate-200 hover:bg-slate-50 text-slate-600 btn-sm gap-1.5 rounded-xl bg-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Filter Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input 
            type="text"
            placeholder="Tìm kiếm nội dung, tên KH..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input input-bordered input-sm w-full pl-9 bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-xl"
          />
        </div>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="select select-bordered select-sm w-full bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-xl"
        >
          <option value="">Tất cả loại hình</option>
          <option value="pawn">Cầm đồ</option>
          <option value="unsecured">Tín chấp</option>
          <option value="installment">Trả góp</option>
        </select>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Mã HĐ</th>
                <th className="px-4 py-3 text-left">Khách hàng</th>
                <th className="px-4 py-3 text-left">Loại hình</th>
                <th className="px-4 py-3 text-right">Tiền đang vay</th>
                <th className="px-4 py-3 text-left">Ngày hẹn</th>
                <th className="px-4 py-3 text-left">Hạn đóng tiền</th>
                <th className="px-4 py-3 text-left">Nội dung</th>
                <th className="px-4 py-3 text-left">Trạng thái</th>
                <th className="px-4 py-3 text-center">Chức năng</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-500 text-sm font-semibold">
                    Không có thông báo hẹn giờ nào
                  </td>
                </tr>
              ) : (
                list.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-100">
                    <td className="px-4 py-3 font-mono font-bold text-slate-600">{item.contract_code || "N/A"}</td>
                    <td className="px-4 py-3 font-semibold">{item.customer_name || "N/A"}</td>
                    <td className="px-4 py-3">{getContractTypeLabel(item.contract_type)}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatCurrency(item.loan_amount)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{formatDate(item.appointment_date)}</td>
                    <td className="px-4 py-3 text-red-500 font-semibold">{formatDate(item.due_date)}</td>
                    <td className="px-4 py-3 text-xs max-w-[200px] truncate" title={item.content}>{item.content}</td>
                    <td className="px-4 py-3">
                      <span className={`badge badge-sm font-bold text-white ${item.status === "pending" ? "badge-warning" : "badge-success"}`}>
                        {item.status === "pending" ? "Đang chờ" : "Đã xử lý"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-2 justify-center">
                        {item.status === "pending" && (
                          <button
                            onClick={() => handleResolve(item.id)}
                            className="btn btn-success btn-xs text-white rounded-lg"
                            type="button"
                          >
                            Xử lý
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDelete(item.id, e)}
                          className="btn btn-outline border-slate-200 text-red-500 hover:bg-red-50 hover:text-red-600 btn-xs rounded-lg"
                          type="button"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creation Modal */}
      <ModalPortal isOpen={isOpen}>
          <div className="modal-box bg-white max-w-md text-slate-800 rounded-2xl relative shadow-2xl p-6 border border-slate-100">
            <button 
              onClick={() => setIsOpen(false)}
              className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4 text-slate-500 hover:text-slate-600"
              type="button"
            >
              x
            </button>

            <h3 className="font-extrabold text-lg mb-4 text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock className="w-5 h-5 text-amber-500" />
              <span>Tạo Lịch Hẹn / Nhắc Nhở</span>
            </h3>

            {formError && (
              <div className="alert alert-error bg-red-50 text-red-700 text-xs py-2 px-3 mb-4 rounded-xl border border-red-100 flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-control w-full">
                  <label className="label py-1">
                    <span className="label-text text-slate-600 font-bold text-xs">Mã hợp đồng (nếu có)</span>
                  </label>
                  <input 
                    type="text"
                    value={contractCode}
                    onChange={(e) => setContractCode(e.target.value)}
                    className="input input-bordered input-sm bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg"
                    placeholder="VD: HD-001"
                  />
                </div>

                <div className="form-control w-full">
                  <label className="label py-1">
                    <span className="label-text text-slate-600 font-bold text-xs">Tên khách hàng</span>
                  </label>
                  <input 
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="input input-bordered input-sm bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg"
                    placeholder="Tên khách nợ"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control w-full">
                  <label className="label py-1">
                    <span className="label-text text-slate-600 font-bold text-xs">Loại hình HĐ</span>
                  </label>
                  <select
                    value={contractType}
                    onChange={(e) => setContractType(e.target.value)}
                    className="select select-bordered select-sm bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg"
                  >
                    <option value="pawn">Cầm đồ</option>
                    <option value="unsecured">Tín chấp</option>
                    <option value="installment">Trả góp</option>
                  </select>
                </div>

                <div className="form-control w-full">
                  <label className="label py-1">
                    <span className="label-text text-slate-600 font-bold text-xs">Số tiền đang vay</span>
                  </label>
                  <MoneyInput 
                    value={loanAmount}
                    onChange={(val) => setLoanAmount(String(val))}
                    placeholder="Số tiền gốc đang vay"
                    suffix="đ"
                    className="input-sm bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-control w-full">
                  <label className="label py-1">
                    <span className="label-text text-slate-600 font-bold text-xs">Ngày hẹn báo chuông <span className="text-red-500">*</span></span>
                  </label>
                  <input 
                    type="datetime-local"
                    required
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="input input-bordered input-sm bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg"
                  />
                </div>

                <div className="form-control w-full">
                  <label className="label py-1">
                    <span className="label-text text-slate-600 font-bold text-xs">Hạn thanh toán cũ</span>
                  </label>
                  <input 
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="input input-bordered input-sm bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg"
                  />
                </div>
              </div>

              <div className="form-control w-full">
                <label className="label py-1">
                  <span className="label-text text-slate-600 font-bold text-xs">Nội dung ghi chú nhắc nhở <span className="text-red-500">*</span></span>
                </label>
                <textarea
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="textarea textarea-bordered bg-white border-slate-200 focus:outline-none focus:border-amber-500 text-slate-800 rounded-lg h-20 text-xs"
                  placeholder="Ghi chú nội dung cần giải quyết hoặc gọi điện..."
                />
              </div>

              <div className="modal-action border-t border-slate-100 pt-4 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)} 
                  className="btn btn-outline border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl btn-sm"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  disabled={formLoading || !appointmentDate || !content}
                  className="btn btn-primary text-white font-bold rounded-xl btn-sm"
                >
                  {formLoading ? <span className="loading loading-spinner"></span> : "Tạo lịch hẹn"}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>
    </div>
  );
};
