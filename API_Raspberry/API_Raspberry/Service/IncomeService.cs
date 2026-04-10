using API_Raspberry.Dto;
using API_Raspberry.Mapper;
using API_Raspberry.Model;
using API_Raspberry.Repository;

namespace API_Raspberry.Service
{
    public interface IIncomeService
    {
        int AddIncome(IncomeRecordCreateDto dto);
        List<IncomeRecordDto> GetAllIncomes(ParamFilter paramFilter);
        IncomeRecordDto GetIncomeById(int id);
        void UpdateIncome(int id, IncomeRecordUpdateDto dto);
        void DeleteIncome(int id);
        int SumAll();
        int SumAllWithFilter(ParamFilter paramFilter);
        List<IncomeRecordDto> GetIncomesByMonth(int month, int year);
        int SumByMonth(int month, int year);
        int SumByCurrentMonth(ParamFilter paramFilter);
        int SumByCurrentWeek(ParamFilter paramFilter);
    }

    public class IncomeService : IIncomeService
    {
        private readonly IIncomeRepository _incomeRepository;
        private readonly IIncomeRecordMapper _incomeRecordMapper;

        public IncomeService(IIncomeRepository incomeRepository, IIncomeRecordMapper incomeRecordMapper)
        {
            _incomeRepository = incomeRepository;
            _incomeRecordMapper = incomeRecordMapper;
        }

        public int AddIncome(IncomeRecordCreateDto dto)
        {
            var entity = _incomeRecordMapper.ToEntity(dto);
            return _incomeRepository.AddIncome(entity);
        }

        public List<IncomeRecordDto> GetAllIncomes(ParamFilter paramFilter)
        {
            var result = _incomeRepository.GetAllIncomes(paramFilter);

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
                    "amount" => isDesc
                        ? result.OrderByDescending(e => e.Amount).ThenByDescending(e => e.Id).ToList()
                        : result.OrderBy(e => e.Amount).ThenBy(e => e.Id).ToList(),
                    _ => result
                };
            }

            return _incomeRecordMapper.ToDtoList(result);
        }

        public IncomeRecordDto GetIncomeById(int id)
        {
            var entity = _incomeRepository.GetIncomeById(id);
            return _incomeRecordMapper.ToDto(entity);
        }

        public void UpdateIncome(int id, IncomeRecordUpdateDto dto)
        {
            _incomeRepository.UpdateIncome(id, dto);
        }

        public void DeleteIncome(int id)
        {
            _incomeRepository.DeleteById(id);
        }

        public int SumAll()
        {
            return _incomeRepository.SumAll();
        }

        public int SumAllWithFilter(ParamFilter paramFilter)
        {
            return _incomeRepository.SumAllWithFilter(paramFilter);
        }

        public List<IncomeRecordDto> GetIncomesByMonth(int month, int year)
        {
            var entities = _incomeRepository.GetIncomesByMonth(month, year);
            return _incomeRecordMapper.ToDtoList(entities);
        }

        public int SumByMonth(int month, int year)
        {
            return _incomeRepository.SumByMonth(new ParamFilter(), month, year);
        }

        public int SumByCurrentMonth(ParamFilter paramFilter)
        {
            var now = DateTime.Now;
            return _incomeRepository.SumByMonth(paramFilter, now.Month, now.Year);
        }

        public int SumByCurrentWeek(ParamFilter paramFilter)
        {
            var today = DateTime.Today;
            int diff = (7 + (today.DayOfWeek - DayOfWeek.Monday)) % 7;
            var startOfWeek = today.AddDays(-diff).Date;
            var endOfWeek = startOfWeek.AddDays(7).Date;
            return _incomeRepository.SumByWeek(paramFilter, startOfWeek, endOfWeek);
        }
    }
}
