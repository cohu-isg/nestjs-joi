import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  Controller,
  INestMicroservice,
  Module,
  RpcExceptionFilter,
  UseFilters,
  UsePipes,
} from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import {
  ClientProxy,
  ClientsModule,
  MessagePattern,
  RpcException,
  Transport,
} from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import * as Joi from 'joi';
import { JoiSchema } from '@cohu-isg/joi-class-decorators';
import { JoiPipe, JoiPipeModule } from 'nestjs-joi';
import { Observable, throwError } from 'rxjs';

describe('NestJS Microservice integration', () => {
  class metatype {
    @JoiSchema(Joi.string().valid('default').required())
    @JoiSchema(['create'], Joi.string().valid('create').required())
    prop!: unknown;
  }

  @Catch(BadRequestException)
  class ExceptionFilter implements RpcExceptionFilter<BadRequestException> {
    catch(exception: BadRequestException, _host: ArgumentsHost): Observable<any> {
      return throwError(() => new RpcException(exception.message));
    }
  }

  @Controller()
  @UseFilters(new ExceptionFilter())
  class AppController {
    @MessagePattern({ cmd: 'test_NoPipe' })
    test_NoPipe(_args: metatype) {
      return 'OK';
    }

    @MessagePattern({ cmd: 'test_ConstructorInUsePipes' })
    @UsePipes(JoiPipe)
    test_ConstructorInUsePipes(_args: metatype) {
      return 'OK';
    }

    @MessagePattern({ cmd: 'test_InstanceInUsePipes' })
    @UsePipes(new JoiPipe())
    test_InstanceInUsePipes(_args: metatype) {
      return 'OK';
    }

    @MessagePattern({ cmd: 'test_InstanceInUsePipesWithGroup' })
    @UsePipes(
      new JoiPipe({
        group: 'create',
      }),
    )
    test_InstanceInUsePipesWithGroup(_args: metatype) {
      return 'OK';
    }
  }
  @Module({
    controllers: [AppController],
  })
  class AppModule {}

  let module: TestingModule;
  let app: INestMicroservice;
  let client: ClientProxy;

  describe('using JoiPipeModule', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          JoiPipeModule,
          AppModule,

          ClientsModule.register([
            {
              name: 'AppService',
              transport: Transport.TCP,
              options: { port: 8765 },
            },
          ]),
        ],
      }).compile();

      app = module.createNestMicroservice({
        transport: Transport.TCP,
        options: {
          port: 8765, // Use specific port
        },
      });

      await app.listen();

      client = app.get<ClientProxy>('AppService');
      await client.connect();
    });

    afterEach(async () => {
      await app.close();
      client.close();
    });

    const CASES = [
      {
        title: 'JoiPipeModule',
        cmd: 'test_NoPipe',
        propValue: 'default',
      },
    ];
    for (const { title, cmd, propValue } of CASES) {
      defineTestCase(title, cmd, propValue);
    }
  });

  describe('with pipes defined in controller', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          AppModule,

          ClientsModule.register([
            {
              name: 'AppService',
              transport: Transport.TCP,
              options: { port: 8765 },
            },
          ]),
        ],
      }).compile();

      app = module.createNestMicroservice({
        transport: Transport.TCP,
        options: {
          port: 8765, // Use specific port
        },
      });

      await app.listen();

      client = app.get<ClientProxy>('AppService');
      await client.connect();
    });

    afterEach(async () => {
      await app.close();
      client.close();
    });

    const CASES = [
      {
        title: '@UsePipes(JoiPipe)',
        cmd: 'test_ConstructorInUsePipes',
        propValue: 'default',
      },
      {
        title: '@UsePipes(new JoiPipe)',
        cmd: 'test_InstanceInUsePipes',
        propValue: 'default',
      },
      {
        title: '@UsePipes(new JoiPipe(GROUP))',
        cmd: 'test_InstanceInUsePipesWithGroup',
        propValue: 'create',
      },
    ];
    for (const { title, cmd, propValue } of CASES) {
      defineTestCase(title, cmd, propValue);
    }
  });

  describe('app.useGlobalPipes(new JoiPipe)', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          AppModule,

          ClientsModule.register([
            {
              name: 'AppService',
              transport: Transport.TCP,
              options: { port: 8765 },
            },
          ]),
        ],
      }).compile();

      app = module.createNestMicroservice({
        transport: Transport.TCP,
        options: {
          port: 8765, // Use specific port
        },
      });
      app.useGlobalPipes(new JoiPipe());

      await app.listen();

      client = app.get<ClientProxy>('AppService');
      await client.connect();
    });

    afterEach(async () => {
      await app.close();
      client.close();
    });

    const CASES = [
      {
        title: 'useGlobalPipes(new JoiPipe)',
        cmd: 'test_NoPipe',
        propValue: 'default',
      },
    ];
    for (const { title, cmd, propValue } of CASES) {
      defineTestCase(title, cmd, propValue);
    }
  });

  describe('app.useGlobalPipes(new JoiPipe(GROUP))', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          AppModule,

          ClientsModule.register([
            {
              name: 'AppService',
              transport: Transport.TCP,
              options: { port: 8765 },
            },
          ]),
        ],
      }).compile();

      app = module.createNestMicroservice({
        transport: Transport.TCP,
        options: {
          port: 8765, // Use specific port
        },
      });
      app.useGlobalPipes(
        new JoiPipe({
          group: 'create',
        }),
      );

      await app.listen();

      client = app.get<ClientProxy>('AppService');
      await client.connect();
    });

    afterEach(async () => {
      await app.close();
      client.close();
    });

    const CASES = [
      {
        title: 'useGlobalPipes(new JoiPipe(GROUP))',
        cmd: 'test_NoPipe',
        propValue: 'create',
      },
    ];
    for (const { title, cmd, propValue } of CASES) {
      defineTestCase(title, cmd, propValue);
    }
  });

  describe('APP_PIPE', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          AppModule,

          ClientsModule.register([
            {
              name: 'AppService',
              transport: Transport.TCP,
              options: { port: 8765 },
            },
          ]),
        ],
        providers: [
          {
            provide: APP_PIPE,
            useClass: JoiPipe,
          },
        ],
      }).compile();

      app = module.createNestMicroservice({
        transport: Transport.TCP,
        options: {
          port: 8765, // Use specific port
        },
      });

      await app.listen();

      client = app.get<ClientProxy>('AppService');
      await client.connect();
    });

    afterEach(async () => {
      await app.close();
      client.close();
    });

    const CASES = [
      {
        title: 'APP_PIPE',
        cmd: 'test_NoPipe',
        propValue: 'default',
      },
    ];
    for (const { title, cmd, propValue } of CASES) {
      defineTestCase(title, cmd, propValue);
    }
  });

  function defineTestCase(title: string, cmd: string, propValue: string) {
    describe(title, () => {
      it('should use the pipe correctly (positive test)', async () => {
        const result = await client.send({ cmd }, { prop: propValue }).toPromise();
        expect(result).toEqual('OK');
      });

      it('should use the pipe correctly (negative test)', async () => {
        try {
          await client.send({ cmd }, { prop: 'invalid' }).toPromise();
          throw new Error('should not be thrown');
        } catch (error: any) {
          expect(error).toEqual({
            error: `Request validation of body failed, because: "prop" must be [${propValue}]`,
            message: `Request validation of body failed, because: "prop" must be [${propValue}]`,
          });
        }
      });
    });
  }
});
