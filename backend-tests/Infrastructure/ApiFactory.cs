using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using NoBacklog.Api.Data;

namespace NoBacklog.Api.Tests.Infrastructure;

/*
 * The real API (Program.cs: routing, [ApiController] validation, JSON options,
 * controllers, services) hosted in memory, with Postgres swapped for the
 * per-test SQLite database in Db. One factory per test, like TestDb.
 *
 * Both DbContextOptions<AppDbContext> and IDbContextOptionsConfiguration<AppDbContext>
 * are removed before re-registering: since EF Core 8, AddDbContext keeps the
 * original UseNpgsql call as a separate configuration, so removing only the
 * options would leave two providers registered.
 *
 * The "Testing" environment keeps the gitignored appsettings.Development.json
 * out of the picture. Time-tracking limits default to TimeTrackingOptions'
 * values unless overridden through the constructor.
 */
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly Dictionary<string, string?> _settings = new();

    public TestDb Db { get; } = new();

    public ApiFactory(int? maxEntriesPerCard = null, int? maxRunningTimers = null)
    {
        if (maxEntriesPerCard is { } entries)
            _settings["TimeTracking:MaxEntriesPerCard"] = entries.ToString();
        if (maxRunningTimers is { } running)
            _settings["TimeTracking:MaxRunningTimers"] = running.ToString();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration(config => config.AddInMemoryCollection(_settings));

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options => options.UseSqlite(Db.Connection));
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing) Db.Dispose();
    }
}
