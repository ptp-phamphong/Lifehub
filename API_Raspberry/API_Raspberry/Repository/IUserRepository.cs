using API_Raspberry.Model;

namespace API_Raspberry.Repository
{
    public interface IUserRepository
    {
        List<User> GetAll();
        User GetById(int id);
        User GetByUsername(string username);
        int Add(User user);
        void Update(User user);
        void Delete(int id);
    }
}
