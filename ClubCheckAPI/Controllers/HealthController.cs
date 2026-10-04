using ClubCheckAPI.Models;
using Microsoft.AspNetCore.Mvc;

namespace ClubCheckAPI.Controllers;

public class HealthController : ControllerBase
{
    
    private readonly ILogger<HealthController> _logger;
    private readonly ClubCheckAPIContext _db;
    
    public HealthController(ILogger<HealthController> logger,  ClubCheckAPIContext db)
    {
        _logger = logger;
        _db = db;
    }
    
    [HttpGet("health")]
    public ActionResult GetHealth()
    {
        _logger.LogInformation("Health controller called!");
        return Ok("working...");
    }

    [HttpGet("health-db")]
    public ActionResult GetHealthDb()
    {
        _logger.LogInformation("Health db controller called!");
        if (_db.Database.CanConnect())
        {
            _logger.LogInformation("DB is connected!");
            return Ok("DB is connected!");
        }
        return Ok("DB is not connected!");
    }
    
}