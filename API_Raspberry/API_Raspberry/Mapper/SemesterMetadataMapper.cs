using API_Raspberry.Dto;
using API_Raspberry.Model;

namespace API_Raspberry.Mapper
{
    public interface ISemesterMetadataMapper
    {
        SemesterMetadataDto ToDto(SemesterMetadata entity);
        List<SemesterMetadataDto> ToDtoList(List<SemesterMetadata> entities);
        SemesterMetadata ToEntity(SemesterMetadataCreateDto dto);
        void UpdateEntity(SemesterMetadata entity, SemesterMetadataUpdateDto dto);
    }

    public class SemesterMetadataMapper : ISemesterMetadataMapper
    {
        public SemesterMetadataDto ToDto(SemesterMetadata entity)
        {
            if (entity == null) return null;

            return new SemesterMetadataDto
            {
                Id = entity.Id,
                SemesterName = entity.SemesterName,
                CodeSemester = entity.CodeSemester,
                Year = entity.Year,
                IsCurrentSemester = entity.IsCurrentSemester
            };
        }

        public List<SemesterMetadataDto> ToDtoList(List<SemesterMetadata> entities)
        {
            return entities.Select(ToDto).ToList();
        }

        public SemesterMetadata ToEntity(SemesterMetadataCreateDto dto)
        {
            return new SemesterMetadata
            {
                SemesterName = dto.SemesterName,
                CodeSemester = dto.CodeSemester,
                Year = dto.Year,
                IsCurrentSemester = dto.IsCurrentSemester
            };
        }

        public void UpdateEntity(SemesterMetadata entity, SemesterMetadataUpdateDto dto)
        {
            entity.SemesterName = dto.SemesterName;
            entity.CodeSemester = dto.CodeSemester;
            entity.Year = dto.Year;
            entity.IsCurrentSemester = dto.IsCurrentSemester;
        }
    }
}
