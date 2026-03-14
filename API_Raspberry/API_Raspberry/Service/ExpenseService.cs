using API_Raspberry.Dto;
using API_Raspberry.Mapper;
using API_Raspberry.Model;
using API_Raspberry.Repository;

namespace API_Raspberry.Service
{
    public interface IExpenseService
    {
        void AddExpense(ExpenseRecordCreateDto dto);
        List<ExpenseRecordDto> GetAllExpenses(ParamFilter paramFilter);
        ExpenseRecordDto GetExpenseById(int id);
        void UpdateExpense(int id, ExpenseRecordUpdateDto dto);
        void DeleteExpense(int id);
        int SumAll();
        int SumAllWithFilter(ParamFilter paramFilter);
        List<ExpenseRecordDto> GetExpensesByMonth(int month, int year);
        int SumByMonth(int month, int year);
        int SumByCurrentMonth(ParamFilter paramFilter);
        int SumByCurrentWeek(ParamFilter paramFilter);
    }

    public class ExpenseService : IExpenseService
    {
        private readonly IExpenseRepository _expenseRepository;
        private readonly IReasonTypeRepository _reasonTypeRepository;
        private readonly IExpenseRecordMapper _expenseRecordMapper;

        public ExpenseService(IExpenseRepository expenseRepository, IReasonTypeRepository reasonTypeRepository, IExpenseRecordMapper expenseRecordMapper)
        {
            _expenseRepository = expenseRepository;
            _reasonTypeRepository = reasonTypeRepository;
            _expenseRecordMapper = expenseRecordMapper;
        }

        public void AddExpense(ExpenseRecordCreateDto dto)
        {
            var entity = _expenseRecordMapper.ToEntity(dto);
            _expenseRepository.AddExpense(entity);
        }

        public List<ExpenseRecordDto> GetAllExpenses(ParamFilter paramFilter)
        {
            var result = _expenseRepository.GetAllExpenses(paramFilter);

            List<ReasonType> reasonTypes = _reasonTypeRepository.GetAllReasonType();
            foreach (var expense in result)
            {
                if (expense.ReasonTypeId.HasValue)
                {
                    expense.ReasonType = reasonTypes.FirstOrDefault(rt => rt.Id == expense.ReasonTypeId.Value);
                }
            }

            // LINQ sorting
            if (!string.IsNullOrEmpty(paramFilter.SortColumn))
            {
                bool isDesc = string.Equals(paramFilter.SortDirection, "desc", StringComparison.OrdinalIgnoreCase);

                result = paramFilter.SortColumn.ToLower() switch
                {
                    "id" => isDesc
                        ? result.OrderByDescending(e => e.Id).ThenByDescending(e => e.Id).ToList()
                        : result.OrderBy(e => e.Id).ThenBy(e => e.Id).ToList(),
                    "createddate" => isDesc
                        ? result.OrderByDescending(e => e.CreatedDate).ThenByDescending(e => e.Id).ToList()
                        : result.OrderBy(e => e.CreatedDate).ThenBy(e => e.Id).ToList(),
                    "reason" => isDesc
                        ? result.OrderByDescending(e => e.Reason).ThenByDescending(e => e.Id).ToList()
                        : result.OrderBy(e => e.Reason).ThenBy(e => e.Id).ToList(),
                    "reasontype" => isDesc
                        ? result.OrderByDescending(e => e.ReasonType?.ReasonName ?? "").ThenByDescending(e => e.Id).ToList()
                        : result.OrderBy(e => e.ReasonType?.ReasonName ?? "").ThenBy(e => e.Id).ToList(),
                    "amount" => isDesc
                        ? result.OrderByDescending(e => e.Amount).ThenByDescending(e => e.Id).ToList()
                        : result.OrderBy(e => e.Amount).ThenBy(e => e.Id).ToList(),
                    _ => result
                };
            }

            return _expenseRecordMapper.ToDtoList(result);
        }

        public ExpenseRecordDto GetExpenseById(int id)
        {
            var entity = _expenseRepository.GetExpenseById(id);
            return _expenseRecordMapper.ToDto(entity);
        }

        public void UpdateExpense(int id, ExpenseRecordUpdateDto dto)
        {
            _expenseRepository.UpdateExpense(id, dto);
        }

        public void DeleteExpense(int id)
        {
            _expenseRepository.DeleteById(id);
        }

        public int SumAll()
        {
            return _expenseRepository.SumAll();
        }

        public int SumAllWithFilter(ParamFilter paramFilter)
        {
            return _expenseRepository.SumAllWithFilter(paramFilter);
        }

        public List<ExpenseRecordDto> GetExpensesByMonth(int month, int year)
        {
            var entities = _expenseRepository.GetExpensesByMonth(month, year);
            return _expenseRecordMapper.ToDtoList(entities);
        }

        public int SumByMonth(int month, int year)
        {
            return _expenseRepository.SumByMonth(new ParamFilter(), month, year);
        }

        public int SumByCurrentMonth(ParamFilter paramFilter)
        {
            var now = DateTime.Now;
            return _expenseRepository.SumByMonth(paramFilter, now.Month, now.Year);
        }

        public int SumByCurrentWeek(ParamFilter paramFilter)
        {
            var today = DateTime.Today;
            int diff = (7 + (today.DayOfWeek - DayOfWeek.Monday)) % 7;
            var startOfWeek = today.AddDays(-diff).Date;
            var endOfWeek = startOfWeek.AddDays(7).Date;
            return _expenseRepository.SumByWeek(paramFilter, startOfWeek, endOfWeek);
        }
    }
}
