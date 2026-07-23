using API_Raspberry.Dto;
using API_Raspberry.Service;
using Microsoft.AspNetCore.Mvc;

namespace API_Raspberry.Controllers
{
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet]
        [Route("User/GetAll")]
        public ActionResult<List<UserDto>> GetAll()
        {
            return Ok(_userService.GetAll());
        }

        [HttpGet]
        [Route("User/GetById/{id}")]
        public ActionResult<UserDto> GetById(int id)
        {
            var user = _userService.GetById(id);
            if (user == null) return NotFound();
            return Ok(user);
        }

        [HttpPost]
        [Route("User/Create")]
        public ActionResult<int> Create([FromBody] UserCreateDto dto)
        {
            var id = _userService.Create(dto);
            return Ok(id);
        }

        [HttpPut]
        [Route("User/Update/{id}")]
        public ActionResult Update(int id, [FromBody] UserUpdateDto dto)
        {
            _userService.Update(id, dto);
            return Ok();
        }

        [HttpPut]
        [Route("User/ChangePassword/{id}")]
        public ActionResult ChangePassword(int id, [FromBody] UserChangePasswordDto dto)
        {
            try
            {
                _userService.ChangePassword(id, dto);
                return Ok();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete]
        [Route("User/Delete/{id}")]
        public ActionResult Delete(int id)
        {
            try
            {
                _userService.Delete(id);
                return Ok();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
