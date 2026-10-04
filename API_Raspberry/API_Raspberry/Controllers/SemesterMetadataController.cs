using API_Raspberry.Dto;
using API_Raspberry.Service;
using API_Raspberry.Filters;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    public class SemesterMetadataController : ControllerBase
    {
        private readonly ISemesterMetadataService _semesterMetadataService;

        public SemesterMetadataController(ISemesterMetadataService semesterMetadataService)
        {
            _semesterMetadataService = semesterMetadataService;
        }

        [HttpPost]
        [Route("SemesterMetadata")]
        public bool Add([FromBody] SemesterMetadataCreateDto semesterMetadata)
        {
            _semesterMetadataService.Add(semesterMetadata);
            return true;
        }

        [AllowInDemo]
        [HttpGet]
        [Route("GetAllSemesterMetadata")]
        public List<SemesterMetadataDto> GetAll()
        {
            return _semesterMetadataService.GetAll();
        }

        [HttpGet]
        [Route("GetSemesterMetadataById/{id}")]
        public SemesterMetadataDto GetById(int id)
        {
            return _semesterMetadataService.GetById(id);
        }

        [HttpPut]
        [Route("UpdateSemesterMetadataById/{id}")]
        public bool UpdateById(int id, [FromBody] SemesterMetadataUpdateDto semesterMetadata)
        {
            _semesterMetadataService.Update(id, semesterMetadata);
            return true;
        }

        [HttpDelete]
        [Route("DeleteSemesterMetadataById/{id}")]
        public bool DeleteById(int id)
        {
            _semesterMetadataService.Delete(id);
            return true;
        }
    }
}
