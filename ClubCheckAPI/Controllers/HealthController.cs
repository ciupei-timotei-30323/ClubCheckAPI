using ClubCheckAPI.Exceptions;
using ClubCheckAPI.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ClubCheckAPI.Controllers;

public class HealthController(ILogger<HealthController> _logger, 
    ClubCheckAPIContext _db) : ControllerBase
{
    
    // private readonly ILogger<HealthController> _logger;
    // private readonly ClubCheckAPIContext _db;
    //
    // public HealthController(ILogger<HealthController> logger,  ClubCheckAPIContext db)
    // {
    //     _logger = logger;
    //     _db = db;
    // }
    
    [HttpGet("health")]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
    public ActionResult<string> GetHealth()
    {
        _logger.LogInformation("Health controller called!");
        
        return Ok("working...");
    }

    [HttpGet("health-db")]
    [ProducesResponseType(typeof(string), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public ActionResult<string> GetHealthDb()
    {
        _logger.LogInformation("Health db controller called!");
        if (_db.Database.CanConnect())
        {
            _logger.LogInformation("DB is connected!");
            return Ok("DB is connected!");
        }

        _logger.LogError("DB is offline ");
        throw new DbNotConnectedException(_db.ContextId.ToString());
    }
    
}