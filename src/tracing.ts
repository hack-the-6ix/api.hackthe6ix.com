import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import {ConsoleSpanExporter, BatchSpanProcessor, NoopSpanProcessor} from '@opentelemetry/sdk-trace-base';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { MongoDBInstrumentation } from '@opentelemetry/instrumentation-mongodb';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { AzureMonitorTraceExporter } from "@azure/monitor-opentelemetry-exporter";

export const init = (serviceName: string) => {  
  const exporter = process.env.NODE_ENV === 'production' ?
    new AzureMonitorTraceExporter({
      connectionString: process.env.AZURE_TRACING_CONNECTIONSTRING
    })
    :
    new ConsoleSpanExporter();

  const spanProcessor = process.env.ENABLE_TRACING?.toLowerCase() === "true" ? new BatchSpanProcessor(exporter) : new NoopSpanProcessor()

  const provider = new NodeTracerProvider({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: serviceName,
    }),
    spanProcessors: [spanProcessor],
  });

  registerInstrumentations({
    instrumentations: [
      new HttpInstrumentation({
        ignoreIncomingRequestHook(req) {
          return req.url?.startsWith('/health') ?? false;
        }
      }),
      new ExpressInstrumentation(),
      new MongoDBInstrumentation()
    ]
  });

  provider.register()
}
