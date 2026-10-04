using Microsoft.AspNetCore.Mvc;

namespace ClubCheckAPI.Controllers;

public class HealthController : ControllerBase
{
    
    private readonly ILogger<HealthController> _logger;
    
    public HealthController(ILogger<HealthController> logger)
    {
        _logger = logger;
    }
    
    [HttpGet("health")]
    public ActionResult GetHealth()
    {
        _logger.LogInformation("Health controller called");
        return Ok("API IS WORKING");
    }    
}