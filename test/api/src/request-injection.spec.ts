import * as Joi from 'joi';
import { JoiSchema } from '@cohu-isg/joi-class-decorators';
import { CREATE, DEFAULT, JoiPipe, UPDATE } from 'nestjs-joi';

describe('request injection', () => {
  class metatype {
    @JoiSchema([DEFAULT], Joi.string())
    @JoiSchema([CREATE], Joi.number())
    @JoiSchema([UPDATE], Joi.symbol())
    prop!: unknown;
  }

  describe('POST', () => {
    it('should validate with the CREATE group (positive test)', async () => {
      const pipe = new JoiPipe({
        // @ts-expect-error
        method: 'post',
      });

      let error;
      try {
        pipe.transform(
          {
            prop: 1,
          },
          { type: '_body' as any, metatype },
        );
      } catch (error_) {
        error = error_;
      }

      expect(error).toBeUndefined();
    });

    it('should validate with the CREATE group (negative test)', async () => {
      const pipe = new JoiPipe({
        // @ts-expect-error
        method: 'post',
      });

      try {
        pipe.transform(
          {
            prop: 'a',
          },
          { type: '_body' as any, metatype },
        );
        throw new Error('should not be thrown');
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toContain('"prop" must be a number');
        } else {
          throw new Error('caught unexpected error type');
        }
      }
    });
  });

  for (const method of ['PUT', 'PATCH']) {
    describe(method, () => {
      it('should validate with the UPDATE group (positive test)', async () => {
        const pipe = new JoiPipe({
          // @ts-expect-error
          method,
        });

        let error;
        try {
          pipe.transform(
            {
              prop: Symbol('prop'),
            },
            { type: '_body' as any, metatype },
          );
        } catch (error_) {
          error = error_;
        }

        expect(error).toBeUndefined();
      });

      it('should validate with the CREATE group (negative test)', async () => {
        const pipe = new JoiPipe({
          // @ts-expect-error
          method,
        });

        try {
          pipe.transform(
            {
              prop: 'a',
            },
            { type: '_body' as any, metatype },
          );
          throw new Error('should not be thrown');
        } catch (error) {
          if (error instanceof Error) {
            expect(error.message).toContain('"prop" must be a symbol');
          } else {
            throw new Error('caught unexpected error type');
          }
        }
      });
    });
  }

  // Not all of them are realistic scenarios, but we want to make sure.
  for (const method of ['GET', 'DELETE', 'HEAD', 'OPTIONS']) {
    describe(method, () => {
      it('should validate with the default group (positive test)', async () => {
        const pipe = new JoiPipe({
          // @ts-expect-error
          method,
        });

        let error;
        try {
          pipe.transform(
            {
              prop: 'a',
            },
            { type: '_query' as any, metatype },
          );
        } catch (error_) {
          error = error_;
        }

        expect(error).toBeUndefined();
      });

      it('should validate with the default group (negative test)', async () => {
        const pipe = new JoiPipe({
          // @ts-expect-error
          method,
        });

        try {
          pipe.transform(
            {
              prop: 1,
            },
            { type: '_query' as any, metatype },
          );
          throw new Error('should not be thrown');
        } catch (error) {
          if (error instanceof Error) {
            expect(error.message).toContain('"prop" must be a string');
          } else {
            throw new Error('caught unexpected error type');
          }
        }
      });
    });
  }
});
