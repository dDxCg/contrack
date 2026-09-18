import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PlatformLoginDto } from '../../dtos/platform/platform.dto';
import { PlatformSessionView } from '../../dtos/platform/platform.response.dto';
import { Public } from '../../services/access-control/access.decorator';
import { PlatformAuthService } from '../../services/platform/platform-auth.service';
@Controller('platform/auth')
export class PlatformAuthController {
  constructor(private readonly platformAuthService: PlatformAuthService) {}
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('login')
  @HttpCode(200)
  login(
    @Body()
    body: PlatformLoginDto,
  ): Promise<PlatformSessionView> {
    return this.platformAuthService.login({ username: body.username, password: body.password });
  }
}
