import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { AuthService } from '../../services/auth/auth.service';
import { AccessContext } from '../../services/access-control/access-context';
import { CurrentAccess, Public } from '../../services/access-control/access.decorator';
import { LoginDto, LogoutDto, RefreshDto } from '../../dtos/auth/auth.dto';
import { SessionView } from '../../dtos/auth/auth.response.dto';
import { EmployeeView } from '../../dtos/employees/employees.response.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() body: LoginDto): Promise<SessionView> {
    return this.authService.login({ email: body.email, password: body.password });
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() body: RefreshDto): Promise<SessionView> {
    return this.authService.refresh(body.refresh_token);
  }

  @Post('logout')
  @HttpCode(204)
  logout(@CurrentAccess() access: AccessContext, @Body() body: LogoutDto): Promise<void> {
    return this.authService.logout(access, body.refresh_token);
  }

  @Get('me')
  me(@CurrentAccess() access: AccessContext): EmployeeView {
    return this.authService.me(access);
  }
}
