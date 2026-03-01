using MissionExtractor.dto;

namespace mission_extractor.Models;

public record ValidationError(Mission Mission, string ErrorType, string? ImagePath);
